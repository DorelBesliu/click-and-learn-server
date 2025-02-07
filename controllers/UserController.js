const {getUser} = require("../helpers/user");
const {query} = require("../helpers/db-connector");

class UserController {
    static async show(req, res) {
        try {
            const user = await getUser(req.user.uid);

            const languages = await query('SELECT * FROM languages WHERE id = ?', [user.language_id]);
            const educationCategories = await query('SELECT education_category_id FROM education_category_user WHERE user_id = ?', [user.id]);

            res.status(200).json({
                givenName: user.given_name,
                faName: user.family_name,
                name: user.name,
                username: user.preferred_username,
                email: user.email,
                emailVerifiedAt: user.email_verified_at,
                schoolId: user.school_id,
                languageId: user.language_id || null,
                language: languages.length > 0 ? languages[0].code : 'de',
                educationCategoriesInitial: user.education_categories_initial,
                educationCategories: educationCategories.map(item => item.education_category_id)
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }
}

module.exports = UserController;
