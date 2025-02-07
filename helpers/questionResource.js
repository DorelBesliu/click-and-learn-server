const questionResource = (questions, answers)=> {
    return questions.map(question => {
        const text = answers.find(item => item.questionId === question.id)
        const textInUserLanguage = text.inUserLanguage
        const textInDELanguage = text.inDELanguage

        return {
            id: question.id,
            nr: question.nr,
            officialNumber: question.official_number,
            mediaType: question.media_type,
            points: question.points,
            media: question.media,
            marked: Boolean(question.is_marked),
            videoStartPicture: question.video_start_picture,
            videoEndPicture: question.video_end_picture,
            videoUrl: question.video_url,
            videoMaxCalls: question.video_max_calls,
            typeOfAnswer: question.type_of_answer,
            textInUserLanguage: {
                question: textInUserLanguage.question,
                answer1: textInUserLanguage.answer_1,
                answer2: textInUserLanguage.answer_2,
                answer3: textInUserLanguage.answer_3,
                heading: textInUserLanguage.heading,
                caption: textInUserLanguage.caption,
                answerValueFront: textInUserLanguage.answer_value_front,
                answerValue1: textInUserLanguage.answer_value_1
            },
            textInDELanguage: {
                question: textInDELanguage.question,
                answer1: textInDELanguage.answer_1,
                answer2: textInDELanguage.answer_2,
                answer3: textInDELanguage.answer_3,
                heading: textInDELanguage.heading,
                caption: textInDELanguage.caption,
                answerValueFront: textInDELanguage.answer_value_front,
                answerValue1: textInDELanguage.answer_value_1
            },
            solution: null,
            comment: question.comment,
            eBookLinks: null,
            status: null
        }
    })
}

module.exports = { questionResource };
