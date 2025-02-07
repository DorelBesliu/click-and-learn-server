const {query} = require("../helpers/db-connector");

class EducationClassesController {
    static async index (req, res) {
        try {
            const [questions] = await query('SELECT points, COUNT(*) AS amount FROM questions GROUP BY points');

            res.status(200).json(questions);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }
}

module.exports = EducationClassesController;
