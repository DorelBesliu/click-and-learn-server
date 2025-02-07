const {getUser} = require("../helpers/user");
const {query} = require("../helpers/db-connector");

class DrivingSchoolController {
    static async show(req, res) {
        try {
            const user = await getUser(req.user.uid);
            const [school] = await query('SELECT * from schools where id =' + user.school_id);

            res.status(200).json({
                code: school.code,
                name: school.name
            });
        } catch (error) {
            console.error('Error:', error);

            res.status(500).json({
                message: 'Something went wrong'
            });
        }
    }
}

module.exports = DrivingSchoolController;
