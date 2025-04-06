// src/pages/questions.jsx
import { useEffect, useState } from "react"
import { useSocketContext } from "@/context/socket"
import Button from "@/components/Button"
import Input from "@/components/Input"
import Form from "@/components/Form"
import Image from "next/image"
import logo from "@/assets/logo.svg"
import toast from "react-hot-toast"

export default function Questions() {
  const { socket } = useSocketContext()
  const [password, setPassword] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [questions, setQuestions] = useState([])
  const [subject, setSubject] = useState("")
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    answers: ["", "", "", ""],
    image: "",
    solution: 0,
    cooldown: 5,
    time: 15,
  })

  useEffect(() => {
    socket.on("questions:list", (questionList) => {
      setQuestions(questionList)
    })

    socket.on("questions:subject", (currentSubject) => {
      setSubject(currentSubject)
    })

    socket.on("questions:auth", (success) => {
      setAuthenticated(success)
      if (success) {
        socket.emit("questions:getAll")
      } else {
        toast.error("Invalid password")
      }
    })

    socket.on("game:errorMessage", (message) => {
      toast.error(message)
    })

    return () => {
      socket.off("questions:list")
      socket.off("questions:subject")
      socket.off("questions:auth")
      socket.off("game:errorMessage")
    }
  }, [socket])

  const handleAuth = () => {
    socket.emit("questions:auth", password)
  }

  const handleAddQuestion = () => {
    if (!newQuestion.question) {
      toast.error("Question text is required")
      return
    }
    
    // Validate answers
    const emptyAnswers = newQuestion.answers.filter(a => !a).length
    if (emptyAnswers > 0) {
      toast.error("All answer options must be filled")
      return
    }

    socket.emit("questions:add", newQuestion)
    setNewQuestion({
      question: "",
      answers: ["", "", "", ""],
      image: "",
      solution: 0,
      cooldown: 5,
      time: 15,
    })
  }

  const handleUpdateSubject = () => {
    if (!subject) {
      toast.error("Subject cannot be empty")
      return
    }
    socket.emit("questions:updateSubject", subject)
  }

  const handleRemoveQuestion = (index) => {
    socket.emit("questions:remove", index)
  }

  const handleAnswerChange = (index, value) => {
    const updatedAnswers = [...newQuestion.answers]
    updatedAnswers[index] = value
    setNewQuestion({ ...newQuestion, answers: updatedAnswers })
  }

  if (!authenticated) {
    return (
      <section className="relative flex min-h-screen flex-col items-center justify-center">
        <div className="absolute h-full w-full overflow-hidden">
          <div className="absolute -left-[15vmin] -top-[15vmin] min-h-[75vmin] min-w-[75vmin] rounded-full bg-primary/15"></div>
          <div className="absolute -bottom-[15vmin] -right-[15vmin] min-h-[75vmin] min-w-[75vmin] rotate-45 bg-primary/15"></div>
        </div>

        <Image src={logo} className="mb-6 h-32" alt="logo" />

        <Form>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
          <Button onClick={handleAuth}>Login</Button>
        </Form>
      </section>
    )
  }

  return (
    <section className="relative min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Rahoot Question Manager</h1>
          <Button onClick={() => window.location.href = "/manager"}>Go to Manager</Button>
        </div>

        <div className="bg-white rounded-md p-6 mb-8 shadow-inset">
          <h2 className="text-xl font-bold mb-4">Quiz Subject</h2>
          <div className="flex gap-4">
            <Input 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter quiz subject"
              className="flex-grow"
            />
            <Button onClick={handleUpdateSubject}>Update Subject</Button>
          </div>
        </div>

        <div className="bg-white rounded-md p-6 mb-8 shadow-inset">
          <h2 className="text-xl font-bold mb-4">Add New Question</h2>
          
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Question Text</label>
            <Input
              value={newQuestion.question}
              onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
              placeholder="Enter question text"
              className="w-full"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Image URL (optional)</label>
            <Input
              value={newQuestion.image}
              onChange={(e) => setNewQuestion({...newQuestion, image: e.target.value})}
              placeholder="https://example.com/image.jpg"
              className="w-full"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Answer Options</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newQuestion.answers.map((answer, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`solution-${i}`}
                    name="solution"
                    checked={newQuestion.solution === i}
                    onChange={() => setNewQuestion({...newQuestion, solution: i})}
                    className="w-4 h-4"
                  />
                  <Input
                    value={answer}
                    onChange={(e) => handleAnswerChange(i, e.target.value)}
                    placeholder={`Answer option ${i+1}`}
                    className="flex-grow"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">Select the radio button next to the correct answer</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-semibold">Cooldown (seconds)</label>
              <Input
                type="number"
                min="1"
                max="30"
                value={newQuestion.cooldown}
                onChange={(e) => setNewQuestion({...newQuestion, cooldown: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Time to Answer (seconds)</label>
              <Input
                type="number"
                min="5"
                max="120"
                value={newQuestion.time}
                onChange={(e) => setNewQuestion({...newQuestion, time: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>
          
          <Button onClick={handleAddQuestion} className="w-full">Add Question</Button>
        </div>

        <div className="bg-white rounded-md p-6 shadow-inset">
          <h2 className="text-xl font-bold mb-4">Question List ({questions.length})</h2>
          
          {questions.length === 0 ? (
            <p className="text-gray-500 italic">No questions added yet</p>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between">
                    <h3 className="font-bold">{q.question}</h3>
                    <button 
                      onClick={() => handleRemoveQuestion(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {q.answers.map((answer, i) => (
                      <div 
                        key={i} 
                        className={`p-2 rounded ${i === q.solution ? 'bg-green-100 border border-green-500' : 'bg-gray-100'}`}
                      >
                        {answer}
                      </div>
                    ))}
                  </div>
                  {q.image && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-500">Image: </span>
                      <a href={q.image} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-sm">
                        {q.image.substring(0, 40)}...
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}