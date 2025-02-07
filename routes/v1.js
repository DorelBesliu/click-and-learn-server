require('dotenv').config();

const express = require('express');
const router = express.Router();

const AnswersController = require('../controllers/AnswersController');
const DrivingSchoolController = require('../controllers/DrivingSchoolController');
const EducationClassesController = require("../controllers/EducationClassesController");
const TopicsController = require("../controllers/TopicsController");
const ErrorPointsQuestionsController = require("../controllers/ErrorPointsQuestionsController");
const LanguagesController = require("../controllers/LanguagesController");
const LearningSessionsController = require("../controllers/LearningSessionsController");
const QuestionsController = require("../controllers/QuestionsController");
const UserController = require("../controllers/UserController");

router.put('/Answer/:question', AnswersController.answerQuestion)

router.get('/DrivingSchool', DrivingSchoolController.show)

router.get('/EducationClasses', EducationClassesController.index)
router.post('/EducationClasses', EducationClassesController.store)
router.put('/EducationClasses/:category', EducationClassesController.update)

router.get('/Topics', TopicsController.index)
router.get('/Topics/EducationClasses', TopicsController.educationClasses)

router.get('/ErrorPointsQuestions', ErrorPointsQuestionsController.index)

router.get('/Languages', LanguagesController.index)
router.put('/Languages', LanguagesController.update)

router.get('/LearningSessions', LearningSessionsController.index)
router.post('/LearningSessions', LearningSessionsController.store)
router.get('/LearningSessions/:session', LearningSessionsController.show)
router.patch('/LearningSessions/:session/Evaluate', LearningSessionsController.evaluate)
router.get('/LearningSessions/:session/Progress', LearningSessionsController.progress)

router.get('/Questions', QuestionsController.index)
router.post('/Questions/:question/Mark', QuestionsController.mark)
router.get('/Questions/ByMedia/:media', QuestionsController.byMedia)
router.get('/Questions/ByTopic/:topic', QuestionsController.byTopic)
router.get('/Questions/ByTypeOfAnswer/:type', QuestionsController.byTypeOfAnswer)
router.get('/Questions/ForExam', QuestionsController.forExam)
router.get('/Questions/Marked', QuestionsController.marked)
router.get('/Questions/New', QuestionsController.new)
router.get('/Questions/Random', QuestionsController.random)
router.get('/Questions/Top100', QuestionsController.top100)
router.get('/Questions/WrongAnswered', QuestionsController.wrongAnswered)

router.get("/UserInfo", UserController.show);

module.exports = router;
