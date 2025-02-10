const {query} = require("../helpers/db-connector");
const {getUser} = require("../helpers/user");

class EducationClassesController {
    static async index(req, res) {
        try {
            const user = await getUser(req.user.uid);

            const categories = await query('SELECT * FROM education_categories');
            const userCategories = await query('SELECT * FROM education_category_user where user_id = ?', [user.id]);

            const userCategoriesIds = userCategories.map(item => item.education_category_id)

            const educationCategories = categories.map(item => ({
                id: item.id,
                name: item.name,
                selected: userCategoriesIds.includes(item.id),
            }));

            res.status(200).json(educationCategories);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                message: 'Something went wrong'
            });
        }
    }

    static async store(req, res) {
        const requestBody = req.body || {};

        try {
            const user = await getUser(req.user.uid);

            if (!Array.isArray(requestBody.educationCategories)) {
                return res.status(400).json({
                    message: 'educationCategories should be an array.',
                });
            }

            await query('UPDATE users SET education_categories_initial = ? WHERE id = ?', [!!requestBody.basic, user.id]);
            await query('DELETE FROM education_category_user WHERE user_id = ?', [user.id]);

            const [educationCategories] = await query('SELECT * FROM education_categories WHERE id IN (?)', [requestBody.educationCategories]);

            if (!educationCategories.length) {
                return res.status(400).json({
                    message: 'Invalid education category IDs.',
                });
            }

            const educationCategoriesValues = educationCategories.map(edCat => [parseInt(edCat.id), user.id]);
            const educationCategoriesQuesitonMarks = educationCategoriesValues.map(() => '(?,?)').join(', ');

            await query(`INSERT INTO education_category_user (education_category_id, user_id) VALUES ${educationCategoriesQuesitonMarks}`, educationCategoriesValues.flat());

            res.status(200).json({ message: 'Education categories updated successfully.' });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                message: 'Something went wrong',
                error: error.message,
            });
        }
    }

    static async update(req, res){
        const classeId = req.params.classe;
        const requestBody = req.body || {};

        try {
            const user = await getUser(req.user.uid);

            if (Object.hasOwn(requestBody, 'basic')) {
                await query('UPDATE users SET education_categories_initial = ? WHERE id = ?', [!!requestBody.basic, user.id]);
            }

            const userEducationCategories = await query(
                'SELECT * FROM education_category_user WHERE user_id = ? AND education_category_id = ?',
                [user.id, classeId]
            );

            if (userEducationCategories.length > 0) {
                await query(
                    'DELETE FROM education_category_user WHERE education_category_id = ? AND user_id = ?',
                    [userEducationCategories[0].education_category_id, user.id]
                );
            } else {
                await query(
                    'INSERT INTO education_category_user (education_category_id, user_id) VALUES (?, ?)',
                    [parseInt(classeId), user.id]
                );
            }

            res.status(200).json({});
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                error,
                message: 'Something went wrong'
            });
        }
    }
}

module.exports = EducationClassesController;
