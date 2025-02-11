const {getUser} = require("../helpers/user");
const {query} = require("../helpers/db-connector");

class LearningSessionsController {
    static async index (req, res) {
        try {
            const { showAll, screenType } = req.query;

            const user = await getUser(req.user.uid);

            const showAllQuery = showAll ? '' : 'LIMIT 10';
            const screenTypeQuery = screenType ? `AND screen_type = '${screenType}'` : '';

            const sessionsCount = await query(
                `SELECT COUNT(*) AS total_count FROM user_sessions WHERE user_id = ? ${screenTypeQuery}`,
                [user.id]
            );

            const sessions = await query(
                `SELECT * FROM user_sessions WHERE user_id = ? ${screenTypeQuery} ORDER BY started_at DESC ${showAllQuery}`,
                [user.id]
            );

            let sessionsData = [];

            if (sessions.length) {
                const sessionIds = sessions.map(item => item.id);
                const answers = await query(
                    `SELECT * FROM session_answers WHERE session_id IN (?)`,
                    [sessionIds]
                );

                const wrongAnswers = answers.filter(answer => answer.question_id && !answer.rated);
                const wrongAnswersQuestionIds = wrongAnswers.map(item => item.question_id);

                const questions = await query(
                    `SELECT * FROM questions WHERE id IN (?)`,
                    [wrongAnswersQuestionIds]
                );

                sessionsData = sessions.map(session => {
                    const sessionWrongAnswersQuestionIds = wrongAnswers
                        .filter(answer => answer.session_id === session.id)
                        .map(item => item.question_id);

                    const sessionQuestions = questions.filter(item => sessionWrongAnswersQuestionIds.includes(item.id));

                    const errorPoints = sessionQuestions.reduce((sum, item) => sum + item.points, 0);

                    return {
                        id: session.id,
                        sessionHash: session.session_hash,
                        examMode: session.exam_mode,
                        screenType: session.screen_type,
                        startedAt: session.started_at,
                        isSubmitted: Boolean(session.is_submitted),
                        errorPoints,
                        passed: errorPoints < 10
                    };
                });
            }

            res.status(200).json({
                sessions: sessionsData,
                total: sessionsCount.total_count
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async store (req, res) {
        try {
            const requestBody = req.body;

            const user = await getUser(req.user.uid);

            const rows = await query(
                `SELECT us.id FROM user_sessions as us LEFT JOIN session_answers as sa ON us.id = sa.session_id WHERE us.user_id = ? AND sa.session_id IS NULL`,
                [user.id]
            );

            if (rows.length > 0) {
                await query('DELETE FROM user_sessions WHERE id IN (?)', [rows.map(row => row.id)]);
            }

            const requestBodyExamMode = requestBody.examMode ?? null;
            const examMode = requestBody.type === 'exam' ? requestBodyExamMode : null;

            const insertResult = await query(
                'INSERT INTO user_sessions (session_hash, screen_type, exam_mode, user_id, started_at) VALUES (?, ?, ?, ?, NOW())',
                [requestBody.session, requestBody.type, examMode, user.id]
            );

            const sessions = await query('SELECT * FROM user_sessions WHERE id = ?', [insertResult.insertId]);

            const session = sessions[0];
            res.status(200).json({
                id: session.id,
                hash: session.session_hash,
                examMode: session.exam_mode,
                screenType: session.screen_type,
                startedAt: session.started_at,
                isSubmitted: session.is_submitted
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async show (req, res) {
        try {
            const sessionHash = req.params.session;

            const user = await getUser(req.user.uid);

            const sessions = await query(
                'SELECT * FROM user_sessions WHERE user_id = ? AND session_hash = ?',
                [user.id, sessionHash]
            );

            if (!sessions.length) {
                return res.status(404).json({ message: 'Session not found' });
            }

            const session = sessions[0];

            const answers = await query(
                'SELECT * FROM session_answers WHERE session_id = ?',
                [session.id]
            );

            let questionsIds = [];
            if (session.screen_type === 'exam' && session.is_submitted) {
                questionsIds = Array.from(
                    session.data.reduce((acc, categoryData) => {
                        categoryData.questions.forEach(question => acc.add(question));
                        return acc;
                    }, new Set())
                );
            } else {
                questionsIds = answers.map(item => item.question_id);
            }

            let questions = [];
            if (questionsIds.length > 0) {
                questions = await query(
                    `SELECT id, answer_1_rating, answer_2_rating, answer_3_rating, number_answer_1, number_answer_2 FROM questions WHERE id IN (${questionsIds.join(',')})`
                );
            }

            const responseBody = {
                id: session.id,
                hash: session.session_hash,
                examMode: session.exam_mode,
                screenType: session.screen_type,
                startedAt: session.started_at,
                isSubmitted: Boolean(session.is_submitted),
                questionsIds,
                solutions: questions.map(question => {
                    const answer = answers.find(item => question.id === item.question_id) || {};

                    const solution = {
                        questionId: question.id,
                        typeOfAnswer: question.type_of_answer,
                        answer1Rating: !!answer.answer_1_rating,
                        answer2Rating: !!answer.answer_2_rating,
                        answer3Rating: !!answer.answer_3_rating,
                        numberAnswer1Rating: answer.number_answer_1,
                        numberAnswer2Rating: answer.number_answer_2,
                        answered: true,
                    };

                    if (session.screen_type !== 'exam' || (session.screen_type === 'exam' && session.is_submitted === 1)) {
                        solution.rated = !!answer.rated;
                        solution.correct = {
                            answer1Rating: !!question.answer_1_rating,
                            answer2Rating: !!question.answer_2_rating,
                            answer3Rating: !!question.answer_3_rating,
                            numberAnswer1Rating: question.number_answer_1,
                            numberAnswer2Rating: question.number_answer_2,
                        };
                    }

                    return solution;
                }),
            };

            return res.status(200).json(responseBody);
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async evaluate (req, res) {
        try {
            const sessionId = req.params.session;

            const user = await getUser(req.user.uid);
            let session = await getSession(user.id, sessionId);

            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }

            if (session.is_submitted === 0) {
                await query('UPDATE user_sessions SET is_submitted = 1 WHERE id = ?', [session.id]);
            }

            session = await getSession(user.id, sessionId);

            res.status(200).json({
                id: session.id,
                hash: session.session_hash,
                isSubmitted: Boolean(session.is_submitted),
                screenType: session.screen_type,
                startedAt: session.started_at
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async progress (req, res) {
        try {
            const sessionId = req.params.session;

            const user = await getUser(req.user.uid);
            const sessions = await query('SELECT * FROM user_sessions WHERE user_id = ? AND session_hash = ?', [user.id, sessionId]);
            const session = sessions[0];

            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }

            const latestQuestionAnswersQuery = 'SELECT question_id, MAX(created_at) AS latest_created_at FROM session_answers WHERE session_id = ? GROUP BY question_id';
            const answersQuery = `SELECT sa.* FROM session_answers sa INNER JOIN (${latestQuestionAnswersQuery}) latest_answers ON sa.question_id = latest_answers.question_id AND sa.created_at = latest_answers.latest_created_at`;
            const answers = await query(answersQuery, [session.id]);

            const wrongAnswers = answers.filter(item => !item.rated);
            let wrongQuestionsIds = wrongAnswers.map(item => item.question_id);
            let questionsIds = answers.map(item => item.question_id);

            if (session.screen_type === 'exam') {
                questionsIds = Array.from(session.data.reduce((acc, categoryData) => {
                    categoryData.questions.forEach(question => acc.add(question));
                    return acc;
                }, new Set()));
            }

            if (questionsIds.length === 0) {
                return res.status(422).json({ message: 'No questions found' });
            }

            const questions = await query(`SELECT id, points FROM questions WHERE id IN (?)`, [questionsIds]);
``
            if (session.screen_type === 'exam') {
                const questionsIds = questions.map(item => item.id);
                const answersIds = answers.map(item => item.id);
                const doesNotExistInAnswersQuestionsIds = questionsIds.filter(id => !answersIds.includes(id));
                wrongQuestionsIds = [...wrongQuestionsIds, ...doesNotExistInAnswersQuestionsIds];
            }

            let errorPoints = questions
                .filter(item => wrongQuestionsIds.includes(item.id))
                .reduce((sum, question) => sum + question.points, 0);

            const responseData = {
                screenType: session.screen_type,
                correct: answers.filter(item => item.rated).length,
                wrong: wrongQuestionsIds.length,
                errorPoints,
                wrongQuestionsIds
            };

            if (session.screen_type === 'exam') {
                responseData.passed = errorPoints < 10;
            }

            res.status(200).json(responseData);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }
}

const getSession = async (userId, sessionHash) => {
    const sessions = await query('SELECT * from user_sessions where user_id = ? and session_hash = ?', [userId, sessionHash]);

    return sessions[0];
}

module.exports = LearningSessionsController;
