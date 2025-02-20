import { useState, useRef, useEffect } from 'react'
import './App.css'
import toothLogo from './assets/tooth-logo.svg'
import topGumLogo from './assets/top-gum-logo.svg'

function App() {
  const [mode, setMode] = useState(null)
  const [showCreateOptions, setShowCreateOptions] = useState(false)
  const [createType, setCreateType] = useState(null)
  const [activeTab, setActiveTab] = useState('quiz')
  const [message, setMessage] = useState("Click Me to Get Smarter!")
  const [isMessageFading, setIsMessageFading] = useState(false)
  const [isMessageChanging, setIsMessageChanging] = useState(false)
  const [quizBanks, setQuizBanks] = useState([])
  const [flashcardDecks, setFlashcardDecks] = useState([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [itemName, setItemName] = useState('')
  const [isNameConfirmed, setIsNameConfirmed] = useState(false)
  const [showEnterHint, setShowEnterHint] = useState(false)
  const [isNameEntered, setIsNameEntered] = useState(false)
  const [currentFile, setCurrentFile] = useState(null)
  const [isQuizSaved, setIsQuizSaved] = useState(false)
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const nameInputRef = useRef(null)

  const handleCreateOption = (type) => {
    setCreateType(type)
    setShowCreateOptions(false)
    setMode('create')
    setItemName('')
  }

  const areContentsEqual = (content1, content2) => {
    // If they're both JSON files, parse and compare
    try {
      if (content1.startsWith('{') && content2.startsWith('{')) {
        const parsed1 = JSON.parse(content1)
        const parsed2 = JSON.parse(content2)
        return JSON.stringify(parsed1) === JSON.stringify(parsed2)
      }
    } catch (e) {
      // If JSON parsing fails, fall back to direct string comparison
    }
    // Direct string comparison for text files
    return content1.trim() === content2.trim()
  }

  const handleFileDrop = async (files) => {
    for (const file of files) {
      const fileExtension = file.name.split('.').pop().toLowerCase()
      const isQuizFile = file.name.includes('_quiz')
      const isFlashcardFile = file.name.includes('_flash')
      
      try {
        if (['txt', 'csv', 'jqz'].includes(fileExtension)) {
          const reader = new FileReader()
          
          reader.onload = (e) => {
            const text = e.target.result
            
            // Process quiz files
            if (isQuizFile) {
              const baseName = getBaseName(file.name)
              const existingQuiz = quizBanks.find(bank => getBaseName(bank.name) === baseName)
              
              if (existingQuiz) {
                if (!areContentsEqual(text, existingQuiz.content)) {
                  const confirmReplace = window.confirm(
                    `A quiz named "${baseName}" exists with different content. Do you want to replace it?`
                  )
                  
                  if (confirmReplace) {
                    setQuizBanks(prev => prev.filter(bank => getBaseName(bank.name) !== baseName))
                  } else {
                    return // Skip this file
                  }
                } else {
                  return // Skip if content is identical
                }
              }

              let questionCount = 0
              let isValidFormat = true
              
              if (fileExtension === 'txt') {
                // Trim whitespace and remove empty lines
                const cleanedText = text.trim().replace(/\n\s*\n/g, '\n\n')
                const questions = cleanedText.split('\n\n').filter(q => q.trim())
                
                // Validate format of each question
                isValidFormat = questions.every(q => {
                  const parts = q.split('\n=')
                  return parts.length >= 2 && parts[0].trim() && parts[1].trim()
                })
                
                if (isValidFormat) {
                  questionCount = questions.length
                }
              } else if (fileExtension === 'csv') {
                // Remove empty lines and split into rows
                const rows = text.split('\n')
                  .map(row => row.trim())
                  .filter(row => row)
                
                // Check if CSV has required columns
                const headers = rows[0].toLowerCase().split(',')
                isValidFormat = headers.includes('question') && 
                  (headers.includes('options') || headers.includes('answer'))
                
                if (isValidFormat) {
                  questionCount = rows.length - 1 // Subtract header row
                }
              } else if (fileExtension === 'jqz') {
                try {
                  const content = JSON.parse(text)
                  isValidFormat = content.type === 'quiz' && content.question && content.answers
                  if (isValidFormat) {
                    questionCount = 1
                  }
                } catch (e) {
                  isValidFormat = false
                }
              }
              
              if (!isValidFormat) {
                alert(`Warning: ${file.name} appears to be incorrectly formatted for a quiz file. File was not imported.`)
                return
              }
              
              setQuizBanks(prev => [...prev, {
                name: file.name,
                questionCount,
                content: text
              }])
            }
            
            // Process flashcard files
            else if (isFlashcardFile) {
              const baseName = getBaseName(file.name)
              const existingDeck = flashcardDecks.find(deck => getBaseName(deck.name) === baseName)
              
              if (existingDeck) {
                if (!areContentsEqual(text, existingDeck.content)) {
                  const confirmReplace = window.confirm(
                    `A deck named "${baseName}" exists with different content. Do you want to replace it?`
                  )
                  
                  if (confirmReplace) {
                    setFlashcardDecks(prev => prev.filter(deck => getBaseName(deck.name) !== baseName))
                  } else {
                    return // Skip this file
                  }
                } else {
                  return // Skip if content is identical
                }
              }

              let cardCount = 0
              let isValidFormat = true
              
              if (fileExtension === 'txt') {
                // First, preserve bullet points by temporarily replacing them
                const preservedText = text
                  .replace(/\n- /g, '\n•BULLET•')  // Preserve bullet points
                  .replace(/\n[A-Z]\. /g, '\n•MC•'); // Preserve multiple choice options

                // Now handle the card separations
                const cleanedText = preservedText
                  .replace(/\n[-]+\n/g, '\n\n')  // Handle dash separators
                  .replace(/\n\s*\n/g, '\n\n')   // Normalize multiple newlines
                  .trim();
                  
                // Split into cards and restore bullet points
                const cards = cleanedText
                  .split('\n\n')
                  .map(card => card
                    .replace(/•BULLET•/g, '- ')   // Restore bullet points
                    .replace(/•MC•/g, 'A. ')      // Restore multiple choice markers
                    .trim()
                  )
                  .filter(c => c);
                
                // Validate format of each card
                isValidFormat = cards.every(c => {
                  const parts = c.split('\n=')
                  // Allow multiple = signs in the answer portion
                  if (parts.length < 2) return false;
                  
                  // Combine all parts after the first = sign
                  const question = parts[0].trim();
                  const answer = parts.slice(1).join('\n=').trim();
                  
                  return question && answer;
                });
                
                if (isValidFormat) {
                  cardCount = cards.length;
                } else {
                  console.log('Invalid format detected in cards:', 
                    cards.find(c => {
                      const parts = c.split('\n=')
                      return parts.length < 2 || !parts[0].trim() || !parts.slice(1).join('\n=').trim()
                    })
                  );
                }
              } else if (fileExtension === 'csv') {
                // Remove empty lines and split into rows
                const rows = text.split('\n')
                  .map(row => row.trim())
                  .filter(row => row)
                
                // Check if CSV has required columns
                const headers = rows[0].toLowerCase().split(',')
                isValidFormat = headers.includes('question') && headers.includes('answer')
                
                if (isValidFormat) {
                  cardCount = rows.length - 1 // Subtract header row
                }
              }
              
              if (!isValidFormat) {
                alert(`Warning: ${file.name} appears to be incorrectly formatted for a flashcard file. File was not imported.`)
                return
              }
              
              setFlashcardDecks(prev => [...prev, {
                name: file.name,
                cardCount,
                content: text
              }])
            }
          }
          
          reader.readAsText(file)
        } else {
          alert(`Unsupported file format for ${file.name}. Please use .txt, .csv, or .jqz files.`)
        }
      } catch (error) {
        console.error('Error processing file:', error)
        alert(`Error processing file ${file.name}. Please try again.`)
      }
    }
  }

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    await handleFileDrop(files)
  }

  const handleToothClick = () => {
    if (!activeTab || isMessageChanging) return
    
    setIsMessageChanging(true)
    setMessage("Select a Quiz or Deck to Begin!")
    setIsMessageFading(false)
    
    setTimeout(() => {
      setIsMessageFading(true)
      setTimeout(() => {
        setMessage("Click Me to Get Smarter!")
        setIsMessageFading(false)
        setIsMessageChanging(false)
      }, 1000)
    }, 3000)
  }

  const getBaseName = (filename) => {
    return filename.replace(/_quiz\.(txt|csv|jqz)$|_flash\.(txt|csv|jqz)$/, '')
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    // We'll handle the actual theme switching in CSS
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleItemClick = (item) => {
    setSelectedItem(item)
  }

  const adjustNameFontSize = () => {
    const nameInput = document.getElementById('itemName')
    if (!nameInput) return

    const container = nameInput.parentElement
    const maxWidth = container.offsetWidth - 40

    // Reset to maximum font size first
    nameInput.style.fontSize = '6.4rem'
    
    // If text is wider than container, reduce font size until it fits
    while (nameInput.scrollWidth > maxWidth && parseFloat(nameInput.style.fontSize) > 2.4) {
      const currentSize = parseFloat(nameInput.style.fontSize)
      nameInput.style.fontSize = `${currentSize - 0.2}rem`
    }
  }

  // Add resize observer to handle window/container size changes
  useEffect(() => {
    if (mode === 'create') {
      const nameInput = document.getElementById('itemName')
      if (!nameInput) return

      const resizeObserver = new ResizeObserver(() => {
        adjustNameFontSize()
      })

      resizeObserver.observe(nameInput.parentElement)
      adjustNameFontSize() // Initial adjustment

      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [mode, itemName]) // Re-run when mode or itemName changes

  const handleItemDoubleClick = (item, type) => {
    setSelectedItem(item)
    setMode('create')
    setCreateType(type === 'quiz' ? 'Quiz' : 'Deck')
    setIsEditMode(true)
    setEditingItem(item)
    setItemName(getBaseName(item.name))
    setIsNameEntered(true)
    setIsNameConfirmed(true)
    setIsQuizSaved(!item.name.endsWith('.txt') && !item.name.endsWith('.csv'))
    
    // Parse the content based on file type
    if (item.name.endsWith('.jqz')) {
      const content = JSON.parse(item.content)
      document.getElementById('side1').value = content.question || ''
      document.getElementById('side2').value = content.answers || ''
      if (type === 'quiz') {
        document.getElementById('explanation').value = content.explanation || ''
      }
    } else {
      const lines = item.content.split('\n\n')[0]
      const [question, answer] = lines.split('\n=').map(s => s.trim())
      document.getElementById('side1').value = question || ''
      document.getElementById('side2').value = answer || ''
      if (type === 'quiz') {
        document.getElementById('explanation').value = ''
      }
    }

    // Remove the setTimeout and use requestAnimationFrame for more reliable focus
    requestAnimationFrame(() => {
      const questionInput = document.getElementById('side1')
      if (questionInput) {
        questionInput.focus()
        questionInput.selectionStart = questionInput.value.length
        questionInput.selectionEnd = questionInput.value.length
      }
    })
  }

  const handleBack = () => {
    setMode(null)
    setCreateType(null)
    setItemName('')
    setIsNameConfirmed(false)
    setIsNameEntered(false)
    setShowEnterHint(false)
    setIsQuizSaved(false)
    setCurrentFile(null)
    setIsEditMode(false)
    setEditingItem(null)
  }

  const handleEditClick = () => {
    if (!selectedItem) return
    const type = selectedItem.name.includes('_quiz') ? 'quiz' : 'flashcard'
    handleItemDoubleClick(selectedItem, type)
  }

  const handleItemSelection = (item, event) => {
    const newSelected = new Set(selectedItems)
    
    if (event.ctrlKey || event.metaKey) {
      // Toggle individual selection
      if (newSelected.has(item.name)) {
        newSelected.delete(item.name)
      } else {
        newSelected.add(item.name)
      }
    } else if (event.shiftKey && selectedItems.size > 0) {
      // Get current list based on active tab and current sort
      const currentList = [...(activeTab === 'quiz' ? quizBanks : flashcardDecks)]
        .sort((a, b) => {
          if (sortField === 'name') {
            const nameA = getBaseName(a.name).toLowerCase()
            const nameB = getBaseName(b.name).toLowerCase()
            return sortDirection === 'asc' 
              ? nameA.localeCompare(nameB)
              : nameB.localeCompare(nameA)
          } else {
            const countA = activeTab === 'quiz' ? a.questionCount : a.cardCount
            const countB = activeTab === 'quiz' ? b.questionCount : b.cardCount
            return sortDirection === 'asc'
              ? countA - countB
              : countB - countA
          }
        })

      // Find indices of last selected and current item
      const lastSelectedName = Array.from(selectedItems).pop()
      const startIdx = currentList.findIndex(i => i.name === lastSelectedName)
      const endIdx = currentList.findIndex(i => i.name === item.name)
      
      if (startIdx !== -1 && endIdx !== -1) {
        // Clear previous selection
        newSelected.clear()
        
        // Add all items between start and end indices
        const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)]
        for (let i = min; i <= max; i++) {
          newSelected.add(currentList[i].name)
        }
      }
    } else {
      // Single selection
      newSelected.clear()
      newSelected.add(item.name)
    }
    
    setSelectedItems(newSelected)
  }

  const handleRemoveItems = () => {
    if (activeTab === 'quiz') {
      setQuizBanks(prev => prev.filter(bank => !selectedItems.has(bank.name)))
    } else {
      setFlashcardDecks(prev => prev.filter(deck => !selectedItems.has(deck.name)))
    }
    setSelectedItems(new Set())
  }

  return (
    <div className={`container ${isDarkMode ? 'dark' : 'light'}`}>
      <button 
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {isDarkMode ? '🌙' : '☀️'}
      </button>
      <div className="main-content">
        <div className="left-section">
          {mode === 'create' ? (
            <div className="create-content">
              <div className="input-group name-input-group">
                <input 
                  ref={nameInputRef}
                  id="itemName"
                  className="input-box name-input"
                  placeholder={`Name Your ${createType}`}
                  value={itemName}
                  onChange={(e) => {
                    setItemName(e.target.value)
                    if (!showEnterHint && e.target.value) {
                      setShowEnterHint(true)
                    }
                    setTimeout(adjustNameFontSize, 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && itemName.trim()) {
                      setIsNameConfirmed(true)
                      setShowEnterHint(false)
                      setIsNameEntered(true)
                      setTimeout(() => {
                        const questionInput = document.getElementById('side1')
                        if (questionInput) {
                          questionInput.focus()
                          questionInput.selectionStart = 0
                          questionInput.selectionEnd = 0
                        }
                      }, 0)
                    }
                  }}
                />
                {showEnterHint && !isNameEntered && (
                  <div className="enter-hint">Press Enter</div>
                )}
              </div>
              
              <div className="create-form">
                <div className="input-group">
                  <label htmlFor="side1">
                    {createType === 'Quiz' ? 'Question:' : 'Side 1:'}
                  </label>
                  <textarea 
                    id="side1"
                    className="input-box"
                    placeholder={`Enter your ${createType === 'Quiz' ? 'question' : 'first side'} here...`}
                    rows="4"
                    disabled={!isNameConfirmed}
                  />
                </div>

                <div className="input-group answer-choices-group">
                  <label htmlFor="side2">
                    {createType === 'Quiz' ? 'Answer Choices:' : 'Side 2:'}
                  </label>
                  <textarea 
                    id="side2"
                    className="input-box"
                    placeholder={`Enter ${createType === 'Quiz' ? 'answer choices' : 'second side'} here...`}
                    rows="6"
                    disabled={!isNameConfirmed}
                  />
                </div>

                {createType === 'Quiz' && (
                  <div className="input-group">
                    <label htmlFor="explanation">Explanation:</label>
                    <textarea 
                      id="explanation"
                      className="input-box explanation-box"
                      placeholder="Enter optional explanation here..."
                      rows="3"
                      disabled={!isNameConfirmed}
                    />
                  </div>
                )}
              </div>

              {isNameEntered && (
                <button 
                  className="add-question-button"
                  onClick={() => {
                    // Add new question/card logic here
                    console.log('Add new question/card')
                  }}
                >
                  <span className="plus-icon">➕</span>
                </button>
              )}

              <div className="button-container">
                {!isQuizSaved && (  // Only show Cancel/Back button if quiz isn't saved
                  <button 
                    className="back-button"
                    onClick={handleBack}
                  >
                    {isNameEntered ? 'Back' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <button 
                className="tooth-button"
                onClick={handleToothClick}
                aria-label="Tooth Button"
              >
                <img src={toothLogo} className="tooth-logo" alt="Tooth Logo" />
              </button>
              <div className={`message-bubble ${isMessageFading ? 'fade-out' : ''}`}>
                {message}
              </div>
              <h1>Welcome to jQuizzle-T2!</h1>
            </>
          )}
          
          <div className="options">
            {mode === 'create' ? (
              isNameEntered && !isQuizSaved ? (
                <button 
                  className="large-button save-button"
                  onClick={() => {
                    // Create and save the file
                    const content = {
                      type: createType.toLowerCase(),
                      name: itemName,
                      question: document.getElementById('side1').value,
                      answers: document.getElementById('side2').value,
                      explanation: createType === 'Quiz' ? document.getElementById('explanation').value : null
                    }
                    
                    const blob = new Blob([JSON.stringify(content)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${itemName}_${createType === 'Quiz' ? 'quiz' : 'flash'}.jqz`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    
                    // Set the current file and mark as saved
                    setCurrentFile(`${itemName}_${createType === 'Quiz' ? 'quiz' : 'flash'}.jqz`)
                    setIsQuizSaved(true)
                    
                    // Auto-import the file
                    if (createType === 'Quiz') {
                      setQuizBanks(prev => [...prev, {
                        name: `${itemName}_quiz.jqz`,
                        questionCount: 1,
                        content: JSON.stringify(content)
                      }])
                    } else {
                      setFlashcardDecks(prev => [...prev, {
                        name: `${itemName}_flash.jqz`,
                        cardCount: 1,
                        content: JSON.stringify(content)
                      }])
                    }
                  }}
                >
                  <span className="button-icon">
                    {createType === 'Quiz' ? '📝' : '🗂️'}
                  </span>
                  Save {createType}
                </button>
              ) : isNameEntered ? (
                <button 
                  className="large-button back-button"
                  onClick={handleBack}
                >
                  Back
                </button>
              ) : null
            ) : (
              <>
                <div className="create-dropdown-container">
                  <button 
                    className="large-button"
                    onClick={() => setShowCreateOptions(!showCreateOptions)}
                  >
                    <span className="button-icon">✏️</span>
                    <span className="button-text">Create</span>
                  </button>
                  {showCreateOptions && (
                    <div className="create-dropdown">
                      <button 
                        className="create-option"
                        onClick={() => handleCreateOption('Quiz')}
                      >
                        <span className="button-icon">📝</span>
                        Quiz
                      </button>
                      <button 
                        className="create-option"
                        onClick={() => handleCreateOption('Deck')}
                      >
                        <span className="button-icon">🗂️</span>
                        Deck
                      </button>
                    </div>
                  )}
                </div>
                <button className="large-button" onClick={() => document.getElementById('import-file-upload').click()}>
                  <span className="button-icon">📥</span>
                  <span className="button-text">Import</span>
                  <input
                    id="import-file-upload"
                    type="file"
                    accept=".txt,.csv,.jqz"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="right-section">
          {mode === 'create' ? (
            <>
              <div className="bank-header">
                <span>{createType === 'Quiz' ? 'Questions' : 'Flashcards'}</span>
              </div>
              <div className="bank-container">
                <div className="empty-state create-mode">
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'quiz' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('quiz')
                    // Clear selection if it's a flashcard deck
                    if (selectedItem?.name.includes('_flash')) {
                      setSelectedItem(null)
                    }
                  }}
                >
                  Quiz Bank
                </button>
                <button 
                  className={`tab ${activeTab === 'flashcards' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('flashcards')
                    // Clear selection if it's a quiz
                    if (selectedItem?.name.includes('_quiz')) {
                      setSelectedItem(null)
                    }
                  }}
                >
                  Flashcard Decks
                </button>
              </div>
              
              <div className="tab-content"
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDraggingOver(true)
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDraggingOver(false)
                  const files = Array.from(e.dataTransfer.files)
                  handleFileDrop(files)
                }}
              >
                {activeTab === 'quiz' ? (
                  <div className={`bank-container ${isDraggingOver ? 'dragging-over' : ''}`}>
                    <div className="bank-header">
                      <button 
                        className={`sort-button ${sortField === 'name' ? 'active' : ''}`}
                        onClick={() => handleSort('name')}
                      >
                        Quiz
                        {sortField === 'name' && (
                          <span className="sort-arrow">
                            {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </button>
                      <button 
                        className={`sort-button ${sortField === 'count' ? 'active' : ''}`}
                        onClick={() => handleSort('count')}
                      >
                        Questions
                        {sortField === 'count' && (
                          <span className="sort-arrow">
                            {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </button>
                    </div>
                    {[...quizBanks]
                      .sort((a, b) => {
                        if (sortField === 'name') {
                          const nameA = getBaseName(a.name).toLowerCase()
                          const nameB = getBaseName(b.name).toLowerCase()
                          return sortDirection === 'asc' 
                            ? nameA.localeCompare(nameB)
                            : nameB.localeCompare(nameA)
                        } else {
                          return sortDirection === 'asc'
                            ? a.questionCount - b.questionCount
                            : b.questionCount - a.questionCount
                        }
                      })
                      .map((bank, index) => (
                        <div 
                          key={bank.name} 
                          className={`bank-item ${selectedItems.has(bank.name) ? 'selected' : ''}`}
                          onClick={(e) => handleItemSelection(bank, e)}
                          onDoubleClick={() => handleItemDoubleClick(bank, 'quiz')}
                        >
                          <div className="bank-item-left">
                            <span className="bank-item-number">{index + 1}.</span>
                            <span>{getBaseName(bank.name)}</span>
                          </div>
                          <span>{bank.questionCount} questions</span>
                        </div>
                      ))}
                    {quizBanks.length === 0 && (
                      <div className="empty-state">
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`bank-container ${isDraggingOver ? 'dragging-over' : ''}`}>
                    <div className="bank-header">
                      <button 
                        className={`sort-button ${sortField === 'name' ? 'active' : ''}`}
                        onClick={() => handleSort('name')}
                      >
                        Deck
                        {sortField === 'name' && (
                          <span className="sort-arrow">
                            {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </button>
                      <button 
                        className={`sort-button ${sortField === 'count' ? 'active' : ''}`}
                        onClick={() => handleSort('count')}
                      >
                        Cards
                        {sortField === 'count' && (
                          <span className="sort-arrow">
                            {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </button>
                    </div>
                    {[...flashcardDecks]
                      .sort((a, b) => {
                        if (sortField === 'name') {
                          const nameA = getBaseName(a.name).toLowerCase()
                          const nameB = getBaseName(b.name).toLowerCase()
                          return sortDirection === 'asc'
                            ? nameA.localeCompare(nameB)
                            : nameB.localeCompare(nameA)
                        } else {
                          return sortDirection === 'asc'
                            ? a.cardCount - b.cardCount
                            : b.cardCount - a.cardCount
                        }
                      })
                      .map((deck, index) => (
                        <div 
                          key={deck.name} 
                          className={`bank-item ${selectedItems.has(deck.name) ? 'selected' : ''}`}
                          onClick={(e) => handleItemSelection(deck, e)}
                          onDoubleClick={() => handleItemDoubleClick(deck, 'flashcard')}
                        >
                          <div className="bank-item-left">
                            <span className="bank-item-number">{index + 1}.</span>
                            <span>{getBaseName(deck.name)}</span>
                          </div>
                          <span>{deck.cardCount} cards</span>
                        </div>
                      ))}
                    {flashcardDecks.length === 0 && (
                      <div className="empty-state">
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedItems.size > 0 && !mode && (
                <div className="action-buttons">
                  {selectedItems.size === 1 && (
                    <button 
                      className="edit-button"
                      onClick={() => {
                        const item = activeTab === 'quiz' 
                          ? quizBanks.find(b => b.name === Array.from(selectedItems)[0])
                          : flashcardDecks.find(d => d.name === Array.from(selectedItems)[0])
                        if (item) {
                          const type = activeTab === 'quiz' ? 'quiz' : 'flashcard'
                          handleItemDoubleClick(item, type)
                        }
                      }}
                    >
                      Edit
                    </button>
                  )}
                  <button 
                    className="remove-button"
                    onClick={handleRemoveItems}
                  >
                    Remove
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="top-gum-container">
        <img src={topGumLogo} className="top-gum-logo" alt="Top Gum Logo" />
        <span className="top-gum-text">A Top Gum Study Tool</span>
      </div>
    </div>
  )
}

export default App
