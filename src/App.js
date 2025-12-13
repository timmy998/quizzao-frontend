import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { marked } from 'marked';

const Quizzao = () => {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [dynamicQuiz, setDynamicQuiz] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const [quizLength, setQuizLength] = useState(5); // 5,10,25
  const [quizMode, setQuizMode] = useState('casual'); // 'casual' or 'competitive'

  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const themes = {
    light: {
      appBg: '#e6f7f7',
      cardBg: '#ffffff',
      text: '#222222',
      subText: '#555555',
      primary: '#ff9f43',
      primaryText: '#ffffff',
      correct: '#c8f7c5',
      wrong: '#f8d7da',
      border: '#dddddd',
      explanationBg: '#e8f0ff',
    },
    dark: {
      appBg: '#050816',
      cardBg: '#111827',
      text: '#e5e7eb',
      subText: '#9ca3af',
      primary: '#8b5cf6',
      primaryText: '#ffffff',
      correct: '#16a34a33',
      wrong: '#dc262633',
      border: '#374151',
      explanationBg: '#1f2937',
    },
  };
  const colors = themes[theme];

  // AI helper state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // STOPWATCH EFFECT (competitive mode only)
  useEffect(() => {
    if (!isRunning || quizMode !== 'competitive') return;

    const start = performance.now() - elapsedMs;
    const id = setInterval(() => {
      const now = performance.now();
      setElapsedMs(now - start);
    }, 100);

    return () => clearInterval(id);
  }, [isRunning, elapsedMs, quizMode]);

  const fetchQuizFromBackend = async () => {
    if (!selectedSubject || !selectedSubject.trim()) {
      alert('Please enter a topic');
      return;
    }
    if (!schoolLevel) {
      alert('Please select a difficulty level');
      return;
    }

    setQuizLoading(true);
    try {
      console.log('Sending request:', {
        topic: selectedSubject,
        difficulty: schoolLevel,
        numberOfQuestions: quizLength,
        mode: quizMode,
      });

      const response = await axios.post('http://localhost:5000/generate-quiz', {
        topic: selectedSubject.trim(),
        difficulty: schoolLevel,
        numberOfQuestions: quizLength,
        mode: quizMode,
      });

      console.log('Received response:', response.data);
      setDynamicQuiz(response.data.questions || []);
      setCurrentView('quiz');
      setCurrentQuestion(0);
      setAnswers([]);
      setScore(0);
      setShowResults(false);
      setSelectedOptionIndex(null);
      setShowFeedback(false);
      setAiQuestion('');
      setAiAnswer('');

      // start/stop stopwatch based on mode
      if (quizMode === 'competitive') {
        setElapsedMs(0);
        setIsRunning(true);
      } else {
        setIsRunning(false);
        setElapsedMs(0);
      }
    } catch (err) {
      console.error('Error fetching quiz:', err);
      const errorMsg =
        err.response?.data?.error || err.message || 'Unknown error';
      alert('Error fetching quiz: ' + errorMsg);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizAnswer = (idx) => {
    const question = dynamicQuiz[currentQuestion];
    if (!question || !question.options) return;

    const chosen = question.options[idx];
    const correct = question.correctAnswer;

    setSelectedOptionIndex(idx);
    setShowFeedback(true);

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = idx;
    setAnswers(newAnswers);

    if (
      chosen &&
      correct &&
      chosen.trim().toLowerCase() === correct.trim().toLowerCase()
    ) {
      if (answers[currentQuestion] == null) {
        setScore((prev) => prev + 1);
      }
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestion < dynamicQuiz.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      const nextIndex = answers[currentQuestion + 1];
      setSelectedOptionIndex(nextIndex ?? null);
      setShowFeedback(nextIndex != null);
    } else {
      setShowResults(true);
      setIsRunning(false); // stop stopwatch at end
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      const prevIndex = answers[currentQuestion - 1];
      setSelectedOptionIndex(prevIndex ?? null);
      setShowFeedback(prevIndex != null);
    }
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setDynamicQuiz([]);
    setCurrentQuestion(0);
    setScore(0);
    setShowResults(false);
    setAnswers([]);
    setSelectedOptionIndex(null);
    setShowFeedback(false);
    setAiQuestion('');
    setAiAnswer('');
    setIsRunning(false);
    setElapsedMs(0);
  };

  // AI ask handler calling backend
  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;
    const currentQ =
      dynamicQuiz[currentQuestion]?.question || selectedSubject || '';

    setAiLoading(true);
    setAiAnswer('');
    try {
      const response = await axios.post('http://localhost:5000/ask-ai', {
        topic: selectedSubject,
        difficulty: schoolLevel,
        mode: quizMode,
        userQuestion: aiQuestion.trim(),
        currentQuestionText: currentQ,
      });

      const answer =
        response.data?.answer ||
        "I couldn't generate a detailed explanation right now. Please try again.";
      setAiAnswer(answer);
    } catch (err) {
      console.error('Error asking AI:', err);
      setAiAnswer(
        'There was an error contacting the AI helper. Please try again in a moment.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // helper to format mm:ss from elapsedMs
  const formattedTime = new Date(elapsedMs).toISOString().substr(14, 5);

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        minHeight: '100vh',
        width: '100vw',
        boxSizing: 'border-box',
        backgroundColor: colors.appBg,
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h1 style={{ color: colors.text }}>Quizzao</h1>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 999,
              color: colors.text,
            }}
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </header>

        {currentView === 'home' && (
          <div
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              color: colors.text,
            }}
          >
            <p style={{ color: colors.subText }}>
              Enter a topic (subject) to generate a short quiz.
            </p>
            <input
              type="text"
              placeholder="e.g. mathematics"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                padding: 8,
                width: 300,
                marginBottom: 12,
                backgroundColor:
                  theme === 'light' ? '#ffffff' : colors.cardBg,
                color: colors.text,
                borderRadius: 6,
                border: `1px solid ${colors.border}`,
              }}
            />

            <div style={{ marginTop: 12, marginBottom: 12, color: colors.text }}>
              <label>Difficulty: </label>
              <select
                value={schoolLevel}
                onChange={(e) => setSchoolLevel(e.target.value)}
                style={{
                  padding: 8,
                  backgroundColor:
                    theme === 'light' ? '#ffffff' : colors.cardBg,
                  color: colors.text,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <option value="">Select level</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div style={{ marginTop: 12, marginBottom: 12, color: colors.text }}>
              <label>Mode: </label>
              <select
                value={quizMode}
                onChange={(e) => setQuizMode(e.target.value)}
                style={{
                  padding: 8,
                  backgroundColor:
                    theme === 'light' ? '#ffffff' : colors.cardBg,
                  color: colors.text,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <option value="casual">Casual (with AI helper)</option>
                <option value="competitive">Competitive (with timer)</option>
              </select>
            </div>

            <div style={{ marginTop: 12, marginBottom: 12, color: colors.text }}>
              <label>Quiz length: </label>
              <select
                value={quizLength}
                onChange={(e) => setQuizLength(Number(e.target.value))}
                style={{
                  padding: 8,
                  backgroundColor:
                    theme === 'light' ? '#ffffff' : colors.cardBg,
                  color: colors.text,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={25}>25 questions</option>
              </select>
            </div>

            <div>
              <button
                onClick={fetchQuizFromBackend}
                disabled={
                  quizLoading || !selectedSubject.trim() || !schoolLevel
                }
                style={{
                  padding: 10,
                  cursor:
                    quizLoading || !selectedSubject.trim() || !schoolLevel
                      ? 'not-allowed'
                      : 'pointer',
                  backgroundColor:
                    quizLoading || !selectedSubject.trim() || !schoolLevel
                      ? colors.border
                      : colors.primary,
                  color: colors.primaryText,
                  border: 'none',
                  borderRadius: 6,
                }}
              >
                {quizLoading ? 'Loading...' : 'Start Quiz'}
              </button>
            </div>
          </div>
        )}

        {currentView === 'quiz' && (
          <div>
            {/* PROGRESS BAR */}
            <div
              style={{
                marginBottom: 12,
                height: 8,
                borderRadius: 999,
                backgroundColor: colors.border,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width:
                    dynamicQuiz.length > 0
                      ? `${((currentQuestion + 1) / dynamicQuiz.length) * 100}%`
                      : '0%',
                  backgroundColor: colors.primary,
                  transition: 'width 0.25s ease',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: 16,
              }}
            >
              {/* LEFT: quiz card */}
              <div
                style={{
                  flex: quizMode === 'casual' ? 3 : 1,
                  backgroundColor: colors.cardBg,
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                  color: colors.text,
                  position: 'relative',
                }}
              >
                <button
                  onClick={handleBackToHome}
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    padding: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    backgroundColor: colors.cardBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    color: colors.text,
                  }}
                >
                  Exit quiz
                </button>

                {/* STOPWATCH DISPLAY (competitive only) */}
                {quizMode === 'competitive' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      padding: '4px 8px',
                      borderRadius: 999,
                      border: `1px solid ${colors.border}`,
                      fontSize: 12,
                      color: colors.text,
                      backgroundColor: colors.cardBg,
                    }}
                  >
                    {formattedTime}
                  </div>
                )}

                {quizLoading && (
                  <div style={{ fontSize: 18, color: colors.subText }}>
                    Loading quiz...
                  </div>
                )}

                {!quizLoading &&
                  dynamicQuiz &&
                  dynamicQuiz.length > 0 &&
                  !showResults && (
                    <div style={{ marginTop: 24 }}>
                      <div
                        style={{
                          marginBottom: 20,
                          fontSize: 18,
                          fontWeight: 'bold',
                          color: colors.text,
                        }}
                      >
                        Question {currentQuestion + 1} / {dynamicQuiz.length}
                      </div>
                      <div
                        style={{
                          marginBottom: 20,
                          fontSize: 16,
                          color: colors.text,
                        }}
                      >
                        {dynamicQuiz[currentQuestion] &&
                          dynamicQuiz[currentQuestion].question}
                      </div>
                      <div>
                        {dynamicQuiz[currentQuestion] &&
                          dynamicQuiz[currentQuestion].options &&
                          dynamicQuiz[currentQuestion].options.map((opt, idx) => {
                            const question = dynamicQuiz[currentQuestion];
                            const correct = question.correctAnswer;

                            let bg =
                              theme === 'light' ? '#f0f0f0' : '#111827';

                            if (showFeedback) {
                              const isChosen = idx === selectedOptionIndex;
                              const isCorrect =
                                opt &&
                                correct &&
                                opt.trim().toLowerCase() ===
                                  correct.trim().toLowerCase();

                              if (isChosen && isCorrect) bg = colors.correct;
                              else if (isChosen && !isCorrect) bg = colors.wrong;
                              else if (!isChosen && isCorrect) bg = colors.correct;
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() =>
                                  !showFeedback && handleQuizAnswer(idx)
                                }
                                style={{
                                  display: 'block',
                                  marginBottom: 10,
                                  padding: 10,
                                  width: '100%',
                                  textAlign: 'left',
                                  cursor: showFeedback ? 'default' : 'pointer',
                                  backgroundColor: bg,
                                  color: colors.text,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: 6,
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                      </div>

                      {showFeedback && dynamicQuiz[currentQuestion] && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: 10,
                            backgroundColor: colors.explanationBg,
                            borderRadius: 6,
                            color: colors.text,
                          }}
                        >
                          <strong>Explanation:</strong>
                          <div>{dynamicQuiz[currentQuestion].explanation}</div>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 20,
                          display: 'flex',
                          gap: 10,
                        }}
                      >
                        <button
                          onClick={goToPreviousQuestion}
                          disabled={currentQuestion === 0}
                          style={{
                            padding: 8,
                            cursor:
                              currentQuestion === 0 ? 'not-allowed' : 'pointer',
                            backgroundColor: colors.cardBg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                          }}
                        >
                          Previous
                        </button>
                        <button
                          onClick={goToNextQuestion}
                          disabled={!showFeedback}
                          style={{
                            padding: 8,
                            cursor: showFeedback ? 'pointer' : 'not-allowed',
                            marginLeft: 'auto',
                            backgroundColor: colors.primary,
                            color: colors.primaryText,
                            border: 'none',
                            borderRadius: 6,
                          }}
                        >
                          {currentQuestion === dynamicQuiz.length - 1
                            ? 'Finish'
                            : 'Next'}
                        </button>
                      </div>
                    </div>
                  )}

                {!quizLoading && dynamicQuiz && dynamicQuiz.length === 0 && (
                  <div style={{ fontSize: 16, color: colors.subText }}>
                    No questions available. Go back and try another topic.
                    <br />
                    <button
                      onClick={handleBackToHome}
                      style={{
                        marginTop: 10,
                        padding: 8,
                        cursor: 'pointer',
                        backgroundColor: colors.primary,
                        color: colors.primaryText,
                        border: 'none',
                        borderRadius: 6,
                      }}
                    >
                      Back to Home
                    </button>
                  </div>
                )}

                {showResults && (
                  <div style={{ marginTop: 24 }}>
                    <h2 style={{ color: colors.text }}>Results</h2>
                    <p style={{ fontSize: 18, color: colors.text }}>
                      Your score: <strong>{score}</strong> /{' '}
                      <strong>{dynamicQuiz.length}</strong>
                    </p>
                    <p style={{ fontSize: 16, color: colors.subText }}>
                      Time taken:{' '}
                      {quizMode === 'competitive' ? formattedTime : 'N/A'}
                    </p>
                    <button
                      onClick={handleBackToHome}
                      style={{
                        padding: 10,
                        cursor: 'pointer',
                        backgroundColor: colors.primary,
                        color: colors.primaryText,
                        border: 'none',
                        borderRadius: 6,
                      }}
                    >
                      Back to Home
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT: AI helper panel (casual only) */}
              {quizMode === 'casual' && (
                <div
                  style={{
                    flex: 3,
                    backgroundColor: colors.cardBg,
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    color: colors.text,
                    alignSelf: 'stretch',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <h3 style={{ marginTop: 0, color: colors.text }}>
                    AI Helper
                  </h3>
                  <p style={{ fontSize: 12, color: colors.subText }}>
                    Ask follow-up questions about this topic or question.
                  </p>
                  <textarea
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Type your question here..."
                    rows={4}
                    style={{
                      resize: 'none',
                      padding: 8,
                      borderRadius: 6,
                      border: `1px solid ${colors.border}`,
                      backgroundColor:
                        theme === 'light' ? '#ffffff' : colors.cardBg,
                      color: colors.text,
                      fontFamily: 'inherit',
                      fontSize: 14,
                    }}
                  />
                  <button
                    onClick={handleAskAI}
                    disabled={aiLoading || !aiQuestion.trim()}
                    style={{
                      padding: 8,
                      cursor:
                        aiLoading || !aiQuestion.trim()
                          ? 'not-allowed'
                          : 'pointer',
                      backgroundColor:
                        aiLoading || !aiQuestion.trim()
                          ? colors.border
                          : colors.primary,
                      color: colors.primaryText,
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 14,
                    }}
                  >
                    {aiLoading ? 'Thinking...' : 'Ask AI'}
                  </button>
                  {aiAnswer && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        borderRadius: 6,
                        backgroundColor: colors.explanationBg,
                        color: colors.text,
                        fontSize: 14,
                        overflowY: 'auto',
                        maxHeight: 300,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(aiAnswer || ''),
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quizzao;
