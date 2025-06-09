const {query} = require("../helpers/db-connector");
const {getUser} = require("../helpers/user");

class LanguagesController {
    static async index (req, res) {
        try {
            const languages = await query('SELECT * FROM languages');

            const languageResources = languages.map(item => ({
                id: item.id,
                code: item.code
            }));

            res.status(200).json(languageResources);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async update (req, res) {
        try {
            const requestedLanguageId = req.params.id;
            const user = await getUser(req.user.uid);

            console.log({requestedLanguageId, userLanguageId: user.language_id})

            if (user && requestedLanguageId !== user.language_id) {
                await query("UPDATE users SET language_id = ? WHERE id = ?", [requestedLanguageId, user.id]);
            }

            res.status(200).send();
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }
}

module.exports = LanguagesController;
