// socket/roles/questions.js
import fs from 'fs'

const Questions = {
  authenticate: (game, io, socket, password) => {
    const isAuthenticated = game.password === password
    socket.emit("questions:auth", isAuthenticated)
  },

  getAllQuestions: (game, io, socket) => {
    socket.emit("questions:list", game.questions)
    socket.emit("questions:subject", game.subject)
  },

  addQuestion: (game, io, socket, question, questionsFile) => {
    // Validate question
    if (!question.question || !question.answers || question.answers.length !== 4) {
      socket.emit("game:errorMessage", "Invalid question format")
      return
    }

    // Add question to game state
    game.questions.push(question)
    
    // Save to file
    try {
      const config = {
        password: game.password,
        subject: game.subject,
        questions: game.questions
      }
      fs.writeFileSync(questionsFile, JSON.stringify(config, null, 2))
      socket.emit("questions:list", game.questions)
      socket.emit("game:errorMessage", "Question added successfully")
    } catch (err) {
      console.error("Error saving questions:", err)
      socket.emit("game:errorMessage", "Error saving question")
    }
  },

  removeQuestion: (game, io, socket, index, questionsFile) => {
    if (index < 0 || index >= game.questions.length) {
      socket.emit("game:errorMessage", "Invalid question index")
      return
    }

    // Remove question
    game.questions.splice(index, 1)
    
    // Save to file
    try {
      const config = {
        password: game.password,
        subject: game.subject,
        questions: game.questions
      }
      fs.writeFileSync(questionsFile, JSON.stringify(config, null, 2))
      socket.emit("questions:list", game.questions)
      socket.emit("game:errorMessage", "Question removed successfully")
    } catch (err) {
      console.error("Error saving questions:", err)
      socket.emit("game:errorMessage", "Error removing question")
    }
  },

  updateSubject: (game, io, socket, subject, questionsFile) => {
    if (!subject) {
      socket.emit("game:errorMessage", "Subject cannot be empty")
      return
    }

    // Update subject
    game.subject = subject
    
    // Save to file
    try {
      const config = {
        password: game.password,
        subject: game.subject,
        questions: game.questions
      }
      fs.writeFileSync(questionsFile, JSON.stringify(config, null, 2))
      socket.emit("questions:subject", game.subject)
      socket.emit("game:errorMessage", "Subject updated successfully")
    } catch (err) {
      console.error("Error saving subject:", err)
      socket.emit("game:errorMessage", "Error updating subject")
    }
  }
}

export default Questions