const {getUser} = require("../helpers/user");
const {questionResource} = require("../helpers/questionResource");
const {query} = require("../helpers/db-connector");

class QuestionsController {
    static async index (req, res) {
        try {
            const { points, search } = req.query;

            const user = await getUser(req.user.uid);
            const whereQueries = [];

            if (points) {
                whereQueries.push(`points = ?`);
            }

            if (search) {
                whereQueries.push(`question LIKE ?`);
            }

            let whereQuery = whereQueries.length > 0 ? `WHERE ${whereQueries.join(' AND ')}` : '';
            const [languages] = await query('SELECT id, code FROM languages');

            const languageCodeId = languages.reduce((acc, item) => {
                acc[item.code] = item.id;
                return acc;
            }, {});

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';
            const answersJoinQuery = 'JOIN question_answers ON questions.id = question_answers.question_id';

            const [questions] = await query(
                `SELECT *, questions.id AS id, ${isMarkedQuery} FROM questions ${answersJoinQuery} ${userQuestionJoinQuery} ${whereQuery} LIMIT 600`,
                [points, search ? `%${search}%` : undefined].filter(Boolean)
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const [questionsAnswers] = await query('SELECT * FROM question_answers WHERE language_id IN (?)', [Array.from(languagesIds)]);

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);

                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async mark(req, res) {
        try {
            const questionId = req.params.question;

            const user = await getUser(req.user.uid);
            const questions = await query('SELECT id FROM questions WHERE id = ?', [questionId]);
            const question = questions[0];

            if (!question) {
                return res.status(404).json({ message: 'Question not found' });
            }

            const userQuestions = await query('SELECT question_id FROM user_question WHERE question_id = ? AND user_id = ?', [question.id, user.id]);

            if (userQuestions.length > 0) {
                await query('DELETE FROM user_question WHERE question_id = ? AND user_id = ?', [question.id, user.id]);
            } else {
                await query('INSERT INTO user_question (question_id, user_id) VALUES (?, ?)', [question.id, user.id]);
            }

            res.status(200).send();
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async byMedia(req, res) {
        try {
            const media = req.params.media;

            const user = await getUser(req.user.uid);
            const languages = await query('SELECT id, code FROM languages');

            const languageCodeId = {};
            languages.forEach(item => {
                if (!(item.code in languageCodeId)) {
                    languageCodeId[item.code] = item.id;
                }
            });

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';

            const questions = await query(
                `SELECT *, questions.id AS id, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} WHERE media_type = ?`,
                [media]
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                `SELECT * FROM question_answers WHERE language_id IN (?)`,
                [[...languagesIds]]
            );

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);
                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async byTopic(req, res) {
        try {
            const topicId = req.params.topic;

            const user = await getUser(req.user.uid);
            const languages = await query('SELECT id, code FROM languages');

            const languageCodeId = {};
            languages.forEach(item => {
                if (!(item.code in languageCodeId)) {
                    languageCodeId[item.code] = item.id;
                }
            });

            const topics = await query('SELECT * FROM topics WHERE id = ?', [topicId]);
            const topic = topics[0];

            if (!topic) {
                return res.status(404).json({ message: 'Topic not found' });
            }

            const topicQuestionJoinQuery = 'JOIN topic_question ON questions.id = topic_question.question_id';
            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';

            const questions = await query(
                `SELECT *, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} ${topicQuestionJoinQuery} WHERE topic_id = ?`,
                [topic.id]
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                `SELECT * FROM question_answers WHERE language_id IN (?)`,
                [Array.from(languagesIds)]
            );

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);
                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async byTypeOfAnswer(req, res) {
        try {
            const type = req.params.type;

            const user = await getUser(req.user.uid);

            const languages = await query('SELECT id, code FROM languages');

            const languageCodeId = {};
            languages.forEach(item => {
                if (!(item.code in languageCodeId)) {
                    languageCodeId[item.code] = item.id;
                }
            });

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';

            const questions = await query(
                `SELECT *, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} WHERE type_of_answer = ?`,
                [type]
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                `SELECT * FROM question_answers WHERE language_id IN (?)`,
                [Array.from(languagesIds)]
            );

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);
                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async forExam(req, res) {
        const requestBody = req.query ?? {};

        try {
            const user = await getUser(req.user.uid);

            const languages = await query('SELECT id, code FROM languages');
            const languageCodeId = languages.reduce((acc, item) => {
                acc[item.code] = item.id;
                return acc;
            }, {});

            const sessions = await query(
                'SELECT * FROM user_sessions WHERE user_id = ? AND session_hash = ?',
                [user.id, requestBody.session]
            );
            const session = sessions[0];

            let categories = {};
            let questions = [];
            let questionsIds = [];

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';

            if (session?.data) {
                session.data.forEach(item => categories[item.category] = item.questions);

                const questionsRows = await query(
                    `SELECT *, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} WHERE id IN (${Object.values(categories).flat().join(',')})`
                );

                const questionsMap = new Map(questionsRows.map(q => [q.id, q]));
                const orderedQuestionIds = Object.values(categories).flat();
                questions = orderedQuestionIds.map(id => questionsMap.get(id));
            } else {
                // Select random 30 questions
                questions = await query(
                    `SELECT *, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} ORDER BY RAND() LIMIT 30`
                );
                questionsIds = questions.map(item => item.id);

                categories = {
                    basic: questionsIds.slice(0, 19),
                    a: questionsIds.slice(19, 24),
                    b: questionsIds.slice(24, 29)
                };

                const stringifiedCategories = JSON.stringify(
                    Object.keys(categories).map(key => ({ category: key, questions: categories[key] }))
                );

                await query(
                    'UPDATE user_sessions SET data = ? WHERE id = ?',
                    [stringifiedCategories, session.id]
                );
            }

            // Fetch answers
            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                `SELECT * FROM question_answers WHERE language_id IN (${Array.from(languagesIds).join(',')})`
            );

            const answers = questions.map(question => ({
                questionId: question.id,
                inUserLanguage: questionsAnswers.find(item => item.question_id === question.id && item.language_id === user.language_id),
                inDELanguage: questionsAnswers.find(item => item.question_id === question.id && item.language_id === languageCodeId['DE'])
            }));

            return res.status(200).json({
                questions: questionResource(questions, answers),
                categories
            });
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async marked(req, res) {
        try {
            const user = await getUser(req.user.uid);
            const languages = await query('SELECT id, code FROM languages');

            const languageCodeId = languages.reduce((acc, item) => {
                acc[item.code] = item.id;
                return acc;
            }, {});

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const questions = await query(
                `SELECT *, TRUE AS is_marked FROM questions ${userQuestionJoinQuery} WHERE user_question.question_id IS NOT NULL`
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                'SELECT * FROM question_answers WHERE language_id IN (?)',
                [Array.from(languagesIds)]
            );

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);

                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async new(req, res) {
        try {
            const user = await getUser(req.user.uid);

            const languages = await query('SELECT id, code FROM languages');
            const languageCodeId = languages.reduce((acc, item) => {
                acc[item.code] = item.id;
                return acc;
            }, {});

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';

            const questions = await query(
                `SELECT *, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} ORDER BY id DESC LIMIT 20`
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                'SELECT * FROM question_answers WHERE language_id IN (?)',
                [Array.from(languagesIds)]
            );

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);

                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async random(req, res) {
        try {
            const questionsAmount = parseInt(req.query.amount, 10) || 10;

            const user = await getUser(req.user.uid);

            const languages = await query('SELECT id, code FROM languages');
            const languageCodeId = languages.reduce((acc, item) => {
                acc[item.code] = item.id;
                return acc;
            }, {});

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';

            const questions = await query(
                `SELECT *, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} ORDER BY RAND() LIMIT ?`,
                [questionsAmount]
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                'SELECT * FROM question_answers WHERE language_id IN (?)',
                [Array.from(languagesIds)]
            );

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);

                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async top100(req, res) {
        try {
            const user = await getUser(req.user.uid);

            const languages = await query('SELECT id, code FROM languages');
            const languageCodeId = languages.reduce((acc, item) => {
                acc[item.code] = item.id;
                return acc;
            }, {});

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';

            const latestAnsw = `
                SELECT question_id, MAX(created_at) AS lts_answ_time
                FROM session_answers
                WHERE rated = 0
                GROUP BY question_id
            `;

            const latestAnswJoin = `
            SELECT sa.question_id
            FROM session_answers AS sa
            JOIN (${latestAnsw}) AS lts_answ
            ON sa.question_id = lts_answ.question_id
            AND sa.created_at = lts_answ.lts_answ_time
            WHERE sa.rated = 0
        `;

            const top100Questions = await query(
                `SELECT session_answers.question_id, COUNT(session_answers.question_id) AS amount
             FROM session_answers
             JOIN (${latestAnswJoin}) AS latest_anws_join ON session_answers.question_id = latest_anws_join.question_id
             WHERE session_answers.rated = 0
             GROUP BY session_answers.question_id
             ORDER BY amount DESC
             LIMIT 100;`
            );

            const top100QuestionsIds = top100Questions.map(item => item.question_id);
            if (top100QuestionsIds.length === 0) {
                return res.status(200).json([]);
            }

            const questions = await query(
                `SELECT *, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} WHERE id IN (?) LIMIT 100`,
                [top100QuestionsIds]
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                'SELECT * FROM question_answers WHERE language_id IN (?)',
                [Array.from(languagesIds)]
            );

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);

                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async wrongAnswered(req, res) {
        try {
            const user = await getUser(req.user.uid);

            const languages = await query('SELECT id, code FROM languages');
            const languageCodeId = languages.reduce((acc, item) => {
                acc[item.code] = item.id;
                return acc;
            }, {});

            const userSessions = await query('SELECT id FROM user_sessions WHERE user_id = ?', [user.id]);
            const userSessionsIds = userSessions.map(item => item.id);

            if (userSessionsIds.length === 0) {
                return res.status(200).json([]);
            }

            const latestAnswQuery = `
            SELECT question_id, MAX(created_at) AS lts_answ_time
            FROM session_answers
            WHERE session_id IN (?)
            GROUP BY question_id
        `;

            const latestAnswJoinQuery = `
            JOIN (${latestAnswQuery}) AS lts_sa
            ON sa.question_id = lts_sa.question_id
            AND sa.created_at = lts_sa.lts_answ_time
        `;

            const wrongAnsweredQuestions = await query(
                `SELECT sa.question_id
             FROM session_answers AS sa
             ${latestAnswJoinQuery}
             WHERE session_id IN (?) AND sa.rated = 0`,
                [userSessionsIds, userSessionsIds]
            );

            const wrongAnsweredQuestionsIds = wrongAnsweredQuestions.map(item => item.question_id);
            if (wrongAnsweredQuestionsIds.length === 0) {
                return res.status(200).json([]);
            }

            const userQuestionJoinQuery = 'LEFT JOIN user_question ON questions.id = user_question.question_id';
            const isMarkedQuery = 'CASE WHEN user_question.question_id IS NOT NULL THEN 1 ELSE 0 END AS is_marked';

            const questions = await query(
                `SELECT *, ${isMarkedQuery} FROM questions ${userQuestionJoinQuery} WHERE id IN (?)`,
                [wrongAnsweredQuestionsIds]
            );

            const languagesIds = new Set([user.language_id, languageCodeId['DE']]);
            const questionsAnswers = await query(
                'SELECT * FROM question_answers WHERE language_id IN (?)',
                [Array.from(languagesIds)]
            );

            const answers = questions.map(question => {
                const questionAnswers = questionsAnswers.filter(item => item.question_id === question.id);

                return {
                    questionId: question.id,
                    inUserLanguage: questionAnswers.find(item => item.language_id === user.language_id),
                    inDELanguage: questionAnswers.find(item => item.language_id === languageCodeId['DE'])
                };
            });

            res.status(200).json(questionResource(questions, answers));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }
}

module.exports = QuestionsController;
