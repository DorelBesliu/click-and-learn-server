const {getUser} = require("../helpers/user");
const {query} = require("../helpers/db-connector");
const {questionResource} = require("../helpers/questionResource");

class TopicsController {
    static async index(req, res) {
        const queryParams = req.query || {};

        try {
            const user = await getUser(req.user.uid);

            const categories = await query('SELECT id FROM education_categories WHERE name = ?', [queryParams.class]);

            const categoryId = categories.length > 0 ? categories[0].id : null;

            let whereQuery = '';
            const queryParamsArray = [user.language_id];

            if (categoryId) {
                whereQuery += 'education_category_id = ?';
                queryParamsArray.push(categoryId);
            }
            if (queryParams.type) {
                whereQuery += whereQuery ? ' AND type = ?' : 'type = ?';
                queryParamsArray.push(queryParams.type);
            }

            const joinWithTopicsCategoriesQuery = 'JOIN topic_education_category as tec ON t.id = tec.topic_id';
            const joinWithTopicTranslationsQuery = 'LEFT JOIN topic_translation as tt ON t.id = tt.topic_id AND tt.language_id = ?';

            const topics = await query(
                `SELECT * FROM topics AS t ${joinWithTopicsCategoriesQuery} ${joinWithTopicTranslationsQuery} ${whereQuery ? `WHERE ${whereQuery}` : ''}`,
                queryParamsArray
            );

            res.status(200).json(topics.map(item => ({
                id: item.id,
                type: item.type,
                label: item.label,
                text: item.text,
                progress: Math.floor(Math.random() * 100) + 1
            })));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }

    static async educationClasses(req, res) {
        try {
            const categories = await query('SELECT * FROM education_categories');
            const topics = await query(
                'SELECT id, type, education_category_id FROM topics AS t JOIN topic_education_category AS tec ON tec.topic_id = t.id'
            );

            const educationClassesTypes = {};

            topics.forEach(topic => {
                const educationCategoryTopicType = `${topic.education_category_id}_${topic.type}`;

                if (!(educationCategoryTopicType in educationClassesTypes)) {
                    const category = categories.find(item => item.id === topic.education_category_id);
                    educationClassesTypes[educationCategoryTopicType] = {
                        class: category.name,
                        type: topic.type
                    };
                }
            });

            res.status(200).json(Object.values(educationClassesTypes));
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Something went wrong' });
        }
    }
}

module.exports = TopicsController;
