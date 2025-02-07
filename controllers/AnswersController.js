const {getUser} = require("../helpers/user");
const {query} = require("../helpers/db-connector");

class AnswersController {
    static async answerQuestion(req, res) {
        const { session, answer1, answer2, answer3, numberAnswer1, numberAnswer2 } = req.body;
        const questionId = req.params.question;


        try {
            const user = await getUser(req.user.uid);
            const [questions] = await query('SELECT * from questions where id = ' + questionId);
            const question = questions[0] || {}

            if (!question) {
                return res.status(404).json({ message: 'Question not found' });
            }

            const [sessions] = await query(
                'SELECT * FROM user_sessions WHERE user_id = ? AND session_hash = ?',
                [user.id, session]
            );

            if (!sessions.length) {
                return res.status(404).json({ message: 'Session not found' });
            }

            const sessionData = sessions[0];
            if (sessionData.screen_type === 'exam' && sessionData.is_submitted === 1) {
                return res.status(403).json({ message: 'You are not allowed to answer a submitted exam session. Please create a new one.' });
            }

            const nowTime = new Date();
            let rated = false;

            if (question.type_of_answer === 1) {
                rated = answer1 == question.answer_1_rating &&
                    answer2 == question.answer_2_rating &&
                    answer3 == question.answer_3_rating;
            }

            if (question.type_of_answer === 2) {
                rated = numberAnswer1 == question.number_answer_1;
                if (numberAnswer2) {
                    rated = rated && numberAnswer2 == question.number_answer_2;
                }
            }

            await query(
                'INSERT INTO session_answers (session_id, question_id, answer_1_rating, answer_2_rating, answer_3_rating, number_answer_1, number_answer_2, rated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [sessionData.id, questionId, Number(Boolean(answer1)), Number(Boolean(answer2)), Number(Boolean(answer3)), numberAnswer1, numberAnswer2, rated, nowTime]
            );

            await query('UPDATE user_sessions SET updated_at = ? WHERE id = ?', [nowTime, sessionData.id]);

            const responseBody = {
                session,
                questionId: question.id,
                answered: true
            };

            if (sessionData.screen_type === 'exam' && sessionData.is_submitted === 0) {
                return res.status(200).json(responseBody);
            }

            responseBody.rated = rated;
            responseBody.correct = {
                answer1Rating: Boolean(question.answer_1_rating),
                answer2Rating: Boolean(question.answer_2_rating),
                answer3Rating: Boolean(question.answer_3_rating),
                numberAnswer1: question.number_answer_1,
                numberAnswer2: question.number_answer_2
            };

            return res.status(200).json(responseBody);
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ message: 'Something went wrong' });
        }
    }
}

module.exports = AnswersController;
