// src/pages/quizzes/create.jsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/auth';
import { toast } from 'react-hot-toast';
import { FiPlus, FiX, FiSave, FiImage, FiClock } from 'react-icons/fi';

export default function CreateQuiz() {
  const router = useRouter();
  const { user, isAuthenticated, loading, isAdmin } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    category: 'General',
    isPublic: true,
    questions: [
      {
        question: '',
        image: '',
        timeLimit: 30,
        answers: ['', '', '', ''],
        correctAnswer: 0
      }
    ]
  });
  
  const categories = [
    'General', 'Science', 'History', 'Geography', 'Sports',
    'Entertainment', 'Technology', 'Language', 'Mathematics', 'Arts', 'Other'
  ];
  
  // Redirect if not authenticated or not admin
  if (loading) {
    return (
      <Layout title="Create Quiz">
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAuthenticated || !isAdmin) {
    router.push('/dashboard');
    return null;
  }
  
  const handleQuizDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizData({
      ...quizData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...quizData.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    
    setQuizData({
      ...quizData,
      questions: updatedQuestions
    });
  };
  
  const handleAnswerChange = (questionIndex, answerIndex, value) => {
    const updatedQuestions = [...quizData.questions];
    updatedQuestions[questionIndex].answers[answerIndex] = value;
    
    setQuizData({
      ...quizData,
      questions: updatedQuestions
    });
  };
  
  const handleCorrectAnswerChange = (questionIndex, answerIndex) => {
    const updatedQuestions = [...quizData.questions];
    updatedQuestions[questionIndex].correctAnswer = answerIndex;
    
    setQuizData({
      ...quizData,
      questions: updatedQuestions
    });
  };
  
  const addQuestion = () => {
    setQuizData({
      ...quizData,
      questions: [
        ...quizData.questions,
        {
          question: '',
          image: '',
          timeLimit: 30,
          answers: ['', '', '', ''],
          correctAnswer: 0
        }
      ]
    });
  };
  
  const removeQuestion = (index) => {
    if (quizData.questions.length <= 1) {
      toast.error('Quiz must have at least one question');
      return;
    }
    
    const updatedQuestions = [...quizData.questions];
    updatedQuestions.splice(index, 1);
    
    setQuizData({
      ...quizData,
      questions: updatedQuestions
    });
  };
  
  const validateQuiz = () => {
    if (!quizData.title.trim()) {
      toast.error('Quiz title is required');
      return false;
    }
    
    if (!quizData.description.trim()) {
      toast.error('Quiz description is required');
      return false;
    }
    
    for (let i = 0; i < quizData.questions.length; i++) {
      const question = quizData.questions[i];
      
      if (!question.question.trim()) {
        toast.error(`Question ${i + 1} text is required`);
        return false;
      }
      
      for (let j = 0; j < question.answers.length; j++) {
        if (!question.answers[j].trim()) {
          toast.error(`Answer option ${j + 1} for question ${i + 1} is required`);
          return false;
        }
      }
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateQuiz()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const token = localStorage.getItem('rahootAuthToken');
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quizData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create quiz');
      }
      
      const newQuiz = await response.json();
      
      toast.success('Quiz created successfully!');
      router.push('/quizzes');
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error(error.message || 'An error occurred while creating the quiz');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Layout title="Create Quiz">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Create New Quiz
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Design your own interactive quiz with multiple-choice questions
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Quiz details */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Quiz Details</h3>
            </div>
            
            <div className="px-6 py-5 space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Quiz Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  value={quizData.title}
                  onChange={handleQuizDataChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="e.g. Geography Challenge"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  required
                  value={quizData.description}
                  onChange={handleQuizDataChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Describe what your quiz is about"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    name="category"
                    id="category"
                    value={quizData.category}
                    onChange={handleQuizDataChange}
                    className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPublic"
                    id="isPublic"
                    checked={quizData.isPublic}
                    onChange={handleQuizDataChange}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                    Make this quiz public (visible to all users)
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Questions */}
          {quizData.questions.map((question, questionIndex) => (
            <div
              key={questionIndex}
              className="bg-white shadow rounded-lg mb-6"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Question {questionIndex + 1}
                </h3>
                
                <button
                  type="button"
                  onClick={() => removeQuestion(questionIndex)}
                  className="inline-flex items-center p-1 border border-transparent rounded-full text-red-600 hover:bg-red-100 focus:outline-none"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="px-6 py-5 space-y-6">
                <div>
                  <label
                    htmlFor={`question-${questionIndex}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Question Text <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id={`question-${questionIndex}`}
                    required
                    value={question.question}
                    onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="e.g. What is the capital of France?"
                  />
                </div>
                
                <div>
                  <label
                    htmlFor={`image-${questionIndex}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Image URL (optional)
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <div className="relative flex items-stretch flex-grow focus-within:z-10">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiImage className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id={`image-${questionIndex}`}
                        value={question.image}
                        onChange={(e) => handleQuestionChange(questionIndex, 'image', e.target.value)}
                        className="focus:ring-primary focus:border-primary block w-full rounded-md pl-10 sm:text-sm border-gray-300"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Provide a URL to an image related to this question
                  </p>
                </div>
                
                <div>
                  <label
                    htmlFor={`timeLimit-${questionIndex}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Time Limit (seconds)
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <div className="relative flex items-stretch flex-grow focus-within:z-10">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiClock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        id={`timeLimit-${questionIndex}`}
                        min="5"
                        max="120"
                        value={question.timeLimit}
                        onChange={(e) => handleQuestionChange(questionIndex, 'timeLimit', parseInt(e.target.value))}
                        className="focus:ring-primary focus:border-primary block w-full rounded-md pl-10 sm:text-sm border-gray-300"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Answer Options <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="space-y-3">
                    {question.answers.map((answer, answerIndex) => (
                      <div key={answerIndex} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id={`correct-${questionIndex}-${answerIndex}`}
                          name={`correct-${questionIndex}`}
                          checked={question.correctAnswer === answerIndex}
                          onChange={() => handleCorrectAnswerChange(questionIndex, answerIndex)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <input
                          type="text"
                          required
                          value={answer}
                          onChange={(e) => handleAnswerChange(questionIndex, answerIndex, e.target.value)}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          placeholder={`Answer option ${answerIndex + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <p className="mt-2 text-sm text-gray-500">
                    Select the radio button next to the correct answer
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex justify-center">
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <FiPlus className="mr-2 -ml-1 h-5 w-5 text-gray-400" />
              Add Question
            </button>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/quizzes')}
              className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center">
                  <FiSave className="mr-2 -ml-1 h-5 w-5" />
                  Save Quiz
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}