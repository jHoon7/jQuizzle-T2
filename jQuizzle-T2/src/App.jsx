import { useState, useRef, useEffect } from 'react'
import './App.css'
import toothLogo from './assets/tooth-logo.svg'
import topGumLogo from './assets/top-gum-logo.svg'
import QuizRunner from './components/QuizRunner'

// Move ConfirmationModal outside of App component
const ConfirmationModal = ({ onConfirm, onCancel, onDiscard }) => {
  return (
    <div className="confirmation-modal-overlay">
      <div className="confirmation-modal">
        <div className="confirmation-message">
          You have unsaved changes. Would you like to save before leaving?
        </div>
        <div className="confirmation-buttons">
          <button 
            className="confirmation-button secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="confirmation-button danger"
            onClick={onDiscard}
          >
            Discard
          </button>
          <button 
            className="confirmation-button primary"
            onClick={onConfirm}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(null)
  const [currentQuestions, setCurrentQuestions] = useState([])
  const [expandedInput, setExpandedInput] = useState(null)
  const [expandedContent, setExpandedContent] = useState('')
  const nameInputRef = useRef(null)
  const side1Ref = useRef(null)
  const side2Ref = useRef(null)
  const explanationRef = useRef(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalQuestions, setOriginalQuestions] = useState([])
  const [inputValues, setInputValues] = useState({
    side1: '',
    side2: '',
    explanation: ''
  })
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState(new Set())
  const [isQuizSaved, setIsQuizSaved] = useState(false)
  const [modifiedQuestions, setModifiedQuestions] = useState(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalType, setConfirmModalType] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const questionImageInputRef = useRef(null)
  const answerImageInputRef = useRef(null)
  const explanationImageInputRef = useRef(null)
  const [showQuizRunner, setShowQuizRunner] = useState(false)

  const handleCreateOption = (type) => {
    setCreateType(type)
    setShowCreateOptions(false)
    setMode('create')
    setItemName('')
    setIsNameEntered(false)
    setIsNameConfirmed(false)
    setHasChanges(false)
    setOriginalQuestions([])
    setCurrentQuestions([])
    
    // Focus on name input after component renders
    setTimeout(() => {
      const nameInput = document.getElementById('itemName')
      if (nameInput) {
        nameInput.focus()
      }
    }, 0)
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
      const content = await file.text()
      try {
        // For .jqz files, use the internal name from the JSON
        if (file.name.endsWith('.jqz')) {
          const parsed = JSON.parse(content)
          const itemName = parsed.name // Use the internal name
          const type = parsed.type === 'quiz' ? 'Quiz' : 'Deck'
          const items = type === 'Quiz' ? parseQuizContent(content) : parseFlashContent(content)
          
          // Add to appropriate bank using internal name
          const newItem = {
            name: `${itemName}_${type.toLowerCase()}.jqz`,
            questionCount: items.length,
            content: content
          }

          if (type === 'Quiz') {
            setQuizBanks(prev => [...prev.filter(bank => 
              getBaseName(bank.name, true) !== getBaseName(newItem.name, true)
            ), newItem])
          } else {
            setFlashcardDecks(prev => [...prev.filter(deck => 
              getBaseName(deck.name, true) !== getBaseName(newItem.name, true)
            ), newItem])
          }
        } else {
          // Handle txt and csv files
          const fileName = file.name.toLowerCase()
          const isQuiz = fileName.includes('quiz')
          const items = isQuiz ? parseQuizContent(content) : parseFlashContent(content)
          
          if (items.length === 0) {
            throw new Error('No valid items found in file')
          }

          // Create standardized content
          const standardizedContent = {
            type: isQuiz ? 'quiz' : 'flashcard',
            name: getBaseName(fileName),
            items: items
          }

          const newItem = {
            name: file.name,
            questionCount: items.length,
            content: JSON.stringify(standardizedContent, null, 2)
          }

          if (isQuiz) {
            setQuizBanks(prev => [...prev.filter(bank => 
              getBaseName(bank.name, true) !== getBaseName(newItem.name, true)
            ), newItem])
          } else {
            setFlashcardDecks(prev => [...prev.filter(deck => 
              getBaseName(deck.name, true) !== getBaseName(newItem.name, true)
            ), newItem])
          }
        }
      } catch (e) {
        console.error(`Error processing file ${file.name}:`, e)
        alert(`Error processing file ${file.name}. Please check the file format.`)
      }
    }
  }

  const handleFileUpload = async (event) =>
    {
    const files = Array.from(event.target.files)
    await handleFileDrop(files)
  }

  const handleToothClick = () => {
    if (!selectedItem) {
      if (!isMessageChanging) {
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
      return
    }

    try {
      const content = JSON.parse(selectedItem.content)
      setShowQuizRunner(true)
    } catch (error) {
      console.error('Error parsing quiz content:', error)
      alert('Error loading quiz content')
    }
  }

  const getBaseName = (filename, forComparison = false) => {
    if (forComparison) {
      // For comparing names, remove all spaces and normalize
      return filename
        .replace(/\s+/g, '')  // Remove all spaces
        .replace(/[_-](?:quiz|flash)\.(txt|csv|jqz)$/i, '')
        .trim()
        .toLowerCase()  // Case insensitive comparison
    }
    
    // For display/general use, just remove the type suffix and extension
    return filename
      .replace(/[_-](?:quiz|flash)\.(txt|csv|jqz)$/i, '')
      .trim()
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

  const parseQuizContent = (content) => {
    try {
      if (content.startsWith('{')) {
        const parsed = JSON.parse(content)
        
        // Handle multi-item format (new)
        if (parsed.items && Array.isArray(parsed.items)) {
          // Don't validate filename against internal name
          return parsed.items.map(item => ({
            question: item.question || '',
            answers: Array.isArray(item.answers) ? item.answers : [],
            explanation: item.explanation || 'No explanation provided.'
          }))
        }
        
        // Handle legacy single-item format
        return [{
          question: parsed.question || '',
          answers: Array.isArray(parsed.answers) ? parsed.answers : [],
          explanation: parsed.explanation || 'No explanation provided.'
        }]
      } else if (content.trim().startsWith('Question,') || content.trim().startsWith('question,')) {
        // Handle CSV files
        console.log('Parsing CSV quiz file...')
        const normalizedContent = content.replace(/\r\n/g, '\n').trim()
        
        // Split into lines, preserving newlines within quoted fields
        const lines = normalizedContent.split(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/)
          .filter(line => line.trim())
        
        // Get headers
        const headers = lines[0].toLowerCase().split(',')
        const questionIndex = headers.indexOf('question')
        const optionsIndex = headers.indexOf('options')
        const explanationIndex = headers.indexOf('explanation')
        
        // Process each line after headers
        return lines.slice(1).map(line => {
          // Split by comma but preserve commas within quotes
          const columns = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map(col => col.trim().replace(/^"|"$/g, '')) // Remove quotes
          
          const question = columns[questionIndex]
          const answerOptions = columns[optionsIndex]
            .split('\n')
            .map(a => a.trim())
            .filter(a => a.length > 0)
          
          return {
            question,
            answers: answerOptions,
            explanation: explanationIndex !== -1 ? columns[explanationIndex] : 'No explanation provided.'
          }
        }).filter(item => item.question && item.answers.length > 0)
      } else {
        // Handle TXT files
        return parseTxtQuiz(content)
      }
    } catch (e) {
      console.error('Error parsing quiz content:', e)
      throw new Error('Invalid quiz format')
    }
  }

  // Separate function for TXT quiz parsing
  const parseTxtQuiz = (content) => {
    const normalizedContent = content.replace(/\r\n/g, '\n').trim()
    const blocks = normalizedContent.split('\n\n').filter(block => block.includes('\n=\n'))
    console.log('Found valid question blocks:', blocks.length)
    
    return blocks.map(block => {
      const parts = block.split('\n=\n')
      if (parts.length !== 2) return null
      
      const question = parts[0].trim()
      const [answerSection, explanationSection] = parts[1].split('\n==\n')
      
      if (!answerSection) return null
      
      const answers = answerSection
        .split('\n')
        .map(a => a.trim())
        .filter(a => a)
      
      return {
        question,
        answers,
        explanation: explanationSection ? explanationSection.trim() : 'No explanation provided.'
      }
    }).filter(Boolean)
  }

  const parseFlashContent = (content) => {
    try {
      if (content.startsWith('{')) {
        const parsed = JSON.parse(content)
        // Handle multi-item format (new)
        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed.items.map(item => ({
            side1: item.side1,
            side2: item.side2
          }))
        }
        // Handle legacy single-item format
        return [{
          side1: parsed.side1,
          side2: parsed.side2
        }]
      } else if (content.trim().startsWith('front,') || content.trim().startsWith('Front,') || 
          content.trim().startsWith('question,') || content.trim().startsWith('Question,')) {
        // Handle CSV files
        console.log('Parsing CSV flashcard file...')
        const normalizedContent = content.replace(/\r\n/g, '\n').trim()
        
        // Split into lines, preserving newlines within quoted fields
        const lines = normalizedContent.split(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/)
          .filter(line => line.trim())
        
        const headers = lines[0].toLowerCase().split(',')
        const side1Index = headers.indexOf('front') !== -1 ? 
          headers.indexOf('front') : headers.indexOf('question')
        const side2Index = headers.indexOf('back') !== -1 ? 
          headers.indexOf('back') : headers.indexOf('answer')
        
        if (side1Index === -1 || side2Index === -1) {
          return parseTxtFlash(content)
        }
        
        return lines.slice(1).map(line => {
          // Split by comma but preserve commas within quotes
          const columns = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map(col => col.trim().replace(/^"|"$/g, '')) // Remove surrounding quotes
            .map(col => col.replace(/""/g, '"')) // Replace double quotes with single quotes
          
          return {
            side1: columns[side1Index],
            side2: columns[side2Index]
          }
        }).filter(item => item.side1 && item.side2)
      } else {
        return parseTxtFlash(content)
      }
    } catch (e) {
      console.error('Error parsing flash content:', e)
      return []
    }
  }

  // Separate function for TXT flashcard parsing
  const parseTxtFlash = (content) => {
    const normalizedContent = content.replace(/\r\n/g, '\n').trim()
    const blocks = normalizedContent.split('\n\n').filter(block => block.includes('\n=\n'))
    console.log('Found valid flashcard blocks:', blocks.length)
    
    return blocks.map(block => {
      const parts = block.split('\n=\n')
      if (parts.length === 2) {
        return {
          side1: parts[0].trim(),
          side2: parts[1].trim()
        }
      }
      return null
    }).filter(Boolean)
  }

  const handleItemDoubleClick = (item, type) => {
    console.log('Double click - item:', item, 'type:', type)
    
    try {
      // Parse the content from the saved file
      const parsedContent = JSON.parse(item.content)
      
      // Get the items array from the new format
      const items = parsedContent.items || []
      
      const batchUpdate = () => {
        setSelectedItem(item)
        setMode('create')
        setCreateType(type === 'quiz' ? 'Quiz' : 'Deck')
        setIsEditMode(true)
        setEditingItem(item)
        setItemName(getBaseName(item.name))
        setIsNameEntered(true)
        setIsNameConfirmed(true)
        setIsQuizSaved(false)
        setHasChanges(false)
        setOriginalQuestions(items)
        setCurrentQuestions(items)
        setSelectedQuestionIndices(new Set())  // Clear any selected questions
        
        // Clear input fields
        const side1Input = document.getElementById('side1')
        const side2Input = document.getElementById('side2')
        const explanationInput = document.getElementById('explanation')
        
        if (side1Input) side1Input.value = ''
        if (side2Input) side2Input.value = ''
        if (explanationInput) explanationInput.value = ''
        
        // Clear input values state
        setInputValues({
          side1: '',
          side2: '',
          explanation: ''
        })
      }
      
      batchUpdate()
      
      console.log('Content to parse:', item.content.substring(0, 200) + '...')
      console.log('Parsed content:', items)
    } catch (error) {
      console.error('Error parsing content:', error)
      alert('Error loading the item. The file might be corrupted.')
    }
  }

  const handleBack = () => {
    if (hasChanges) {
      setConfirmModalType('save')
      setShowConfirmModal(true)
      return
    }
    resetCreateState()
  }

  // Add a helper function to reset the create/edit state
  const resetCreateState = () => {
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
    setHasChanges(false)
    setModifiedQuestions(new Set())
    setCurrentQuestions([])
    setSelectedQuestionIndices(new Set())
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

  const handleAddQuestion = () => {
    // Add a blank question/flashcard
    const blankItem = createType === 'Quiz'
      ? {
          question: '',
          answers: [],
          explanation: ''
        }
      : {
          side1: '',
          side2: ''
        }

    setCurrentQuestions(prev => {
      const newQuestions = [...prev, blankItem]
      const newIndex = newQuestions.length - 1
      setHasChanges(true)
      setIsQuizSaved(false)
      setSelectedQuestionIndices(new Set([newIndex]))
      // Clear modified state for the new question
      setModifiedQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(newIndex)
        return newSet
      })

      // Scroll to the new question after a short delay to ensure DOM update
      setTimeout(() => {
        const questionsList = document.querySelector('.questions-list')
        const newQuestion = questionsList.children[newIndex]
        if (newQuestion) {
          newQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 50)

      return newQuestions
    })

    // Clear all input fields
    const side1Input = document.getElementById('side1')
    const side2Input = document.getElementById('side2')
    const explanationInput = document.getElementById('explanation')
    
    if (side1Input) side1Input.value = ''
    if (side2Input) side2Input.value = ''
    if (explanationInput) explanationInput.value = ''
    
    // Clear input values state
    setInputValues({
      side1: '',
      side2: '',
      explanation: ''
    })

    // Focus on the first input for convenience
    side1Input.focus()
  }

  const handleSave = async () => {
    if (currentQuestions.length === 0) {
      alert('Please add at least one question or flashcard before saving.')
      return Promise.reject('No questions to save')
    }

    const cleanItemName = itemName.trim()

    // Standardize the content structure - but don't use name field for file operations
    const content = {
      type: createType.toLowerCase(),
      name: cleanItemName,  // This is just for display/reference now
      items: currentQuestions.map(item => {
        if (createType === 'Quiz') {
          return {
            question: (item.question || '').trim(),
            answers: Array.isArray(item.answers) ? item.answers.map(a => a.trim()) : [],
            explanation: (item.explanation || 'No explanation provided.').trim(),
            // Include all image arrays if they exist
            ...(item.questionImages?.length > 0 && { questionImages: item.questionImages }),
            ...(item.answersImages?.length > 0 && { answersImages: item.answersImages }),
            ...(item.explanationImages?.length > 0 && { explanationImages: item.explanationImages })
          }
        } else {
          return {
            side1: (item.side1 || '').trim(),
            side2: (item.side2 || '').trim(),
            // Include image arrays if they exist
            ...(item.side1Images?.length > 0 && { side1Images: item.side1Images }),
            ...(item.side2Images?.length > 0 && { side2Images: item.side2Images })
          }
        }
      })
    }

    const fileName = `${cleanItemName}_${createType.toLowerCase()}.jqz`
    const fileContent = JSON.stringify(content, null, 2)

    try {
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'JQuizzle Files',
              accept: {
                'application/json': ['.jqz']
              }
            }],
          })
          const writable = await fileHandle.createWritable()
          await writable.write(fileContent)
          await writable.close()
        } catch (err) {
          if (err.name === 'AbortError') return Promise.reject('Save cancelled')
          throw err
        }
      } else {
        // Fallback to traditional download
        const blob = new Blob([fileContent], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      // Update banks with standardized format
      const newItem = {
        name: fileName,
        questionCount: currentQuestions.length,
        content: fileContent
      }

      if (createType === 'Quiz') {
        setQuizBanks(prev => {
          if (isEditMode && editingItem) {
            return [...prev.filter(bank => bank.name !== editingItem.name), newItem]
          }
          return [...prev.filter(bank => 
            getBaseName(bank.name, true) !== getBaseName(fileName, true)
          ), newItem]
        })
      } else {
        setFlashcardDecks(prev => {
          if (isEditMode && editingItem) {
            return [...prev.filter(deck => deck.name !== editingItem.name), newItem]
          }
          return [...prev.filter(deck => 
            getBaseName(deck.name, true) !== getBaseName(fileName, true)
          ), newItem]
        })
      }

      setCurrentFile(fileName)
      setIsQuizSaved(true)
      setHasChanges(false)
      setModifiedQuestions(new Set())

      return Promise.resolve()

    } catch (err) {
      console.error('Failed to save file:', err)
      alert('Failed to save file. Please try again.')
      return Promise.reject(err)
    }
  }

  const ExpandedInput = ({ inputId, content, onClose }) => {
    return (
      <div className="expanded-input-overlay" onClick={onClose}>
        <div className="expanded-input-container" onClick={e => e.stopPropagation()}>
          <textarea
            className="expanded-input"
            data-input-type={inputId}
            defaultValue={content}
            onChange={(e) => {
              // Update the original input field in real-time
              const input = document.getElementById(inputId);
              if (input) {
                input.value = e.target.value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }}
            autoFocus
          />
          <div className="expanded-controls">
            <button 
              className="expanded-button expanded-back"
              onClick={onClose}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  };

  const checkContentChanges = (newContent, inputId) => {
    // Update input values
    setInputValues(prev => ({
      ...prev,
      [inputId]: newContent
    }))

    // If we have a selected question, update its content
    if (selectedQuestionIndices.size > 0) {
      const currentIndex = Math.max(...Array.from(selectedQuestionIndices))
      
      setCurrentQuestions(prev => {
        const updated = [...prev]
        const currentItem = updated[currentIndex]
        
        if (currentItem) {
          let contentChanged = false
          
          if (createType === 'Quiz') {
            if (inputId === 'side1' && currentItem.question !== newContent) {
              currentItem.question = newContent
              contentChanged = true
            } else if (inputId === 'side2') {
              const newAnswers = newContent.split('\n').filter(a => a.trim())
              if (JSON.stringify(currentItem.answers) !== JSON.stringify(newAnswers)) {
                currentItem.answers = newAnswers
                contentChanged = true
              }
            } else if (inputId === 'explanation' && currentItem.explanation !== newContent) {
              currentItem.explanation = newContent
              contentChanged = true
            }
          } else {
            if (inputId === 'side1' && currentItem.side1 !== newContent) {
              currentItem.side1 = newContent
              contentChanged = true
            } else if (inputId === 'side2' && currentItem.side2 !== newContent) {
              currentItem.side2 = newContent
              contentChanged = true
            }
          }
          
          if (contentChanged) {
            setHasChanges(true)
            setIsQuizSaved(false)
            // Add the modified question to the set
            setModifiedQuestions(prev => new Set([...prev, currentIndex]))
          }
        }
        
        return updated
      })
    }
  }

  const handleQuestionSelect = (index, event) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey
    const isShiftPressed = event.shiftKey
    
    // Handle selection logic
    if (isShiftPressed && selectedQuestionIndices.size > 0) {
      const lastSelected = Math.max(...Array.from(selectedQuestionIndices))
      const start = Math.min(lastSelected, index)
      const end = Math.max(lastSelected, index)
      
      setSelectedQuestionIndices(new Set(
        Array.from({ length: end - start + 1 }, (_, i) => start + i)
      ))
    } else if (isCtrlPressed) {
      setSelectedQuestionIndices(prev => {
        const newSelection = new Set(prev)
        if (newSelection.has(index)) {
          newSelection.delete(index)
        } else {
          newSelection.add(index)
        }
        return newSelection
      })
    } else {
      setSelectedQuestionIndices(new Set([index]))
    }
    
    // Update input fields with the newly selected item's content
    const item = currentQuestions[index]
    const side1Input = document.getElementById('side1')
    const side2Input = document.getElementById('side2')
    const explanationInput = document.getElementById('explanation')
    
    if (side1Input) {
      side1Input.value = createType === 'Quiz' ? (item.question || '') : (item.side1 || '')
    }
    if (side2Input) {
      side2Input.value = createType === 'Quiz' 
        ? (Array.isArray(item.answers) ? item.answers.join('\n') : '') 
        : (item.side2 || '')
    }
    if (createType === 'Quiz' && explanationInput) {
      explanationInput.value = item.explanation || ''
    }
  }

  const handleRemoveQuestion = () => {
    if (selectedQuestionIndices.size === 0) return
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedQuestionIndices.size} ${createType === 'Quiz' ? 'question' : 'card'}${selectedQuestionIndices.size > 1 ? 's' : ''}?`
    )
    
    if (confirmDelete) {
      setCurrentQuestions(prev => {
        const updated = prev.filter((_, index) => !selectedQuestionIndices.has(index))
        setHasChanges(true)
        setSelectedQuestionIndices(new Set())
        
        // Clear input fields
        const side1Input = document.getElementById('side1')
        const side2Input = document.getElementById('side2')
        const explanationInput = document.getElementById('explanation')
        
        if (side1Input) side1Input.value = ''
        if (side2Input) side2Input.value = ''
        if (explanationInput) explanationInput.value = ''
        
        return updated
      })
    }
  }

  const handleImageUpload = async (event, field) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Clear the file input to prevent duplicate uploads
    event.target.value = ''

    // Convert image to base64
    const reader = new FileReader()
    reader.onload = () => {
      const base64Image = reader.result

      // Update the current question with the image
      if (selectedQuestionIndices.size > 0) {
        const currentIndex = Math.max(...Array.from(selectedQuestionIndices))
        
        setCurrentQuestions(prev => {
          // Create a deep copy of the previous state
          const updated = JSON.parse(JSON.stringify(prev))
          const currentItem = updated[currentIndex]
          
          if (currentItem) {
            if (createType === 'Quiz') {
              // Initialize arrays if they don't exist
              if (!currentItem.questionImages) currentItem.questionImages = []
              if (!currentItem.explanationImages) currentItem.explanationImages = []

              // Add image to appropriate array if under limit
              if (field === 'question' && currentItem.questionImages.length < 5) {
                currentItem.questionImages.push(base64Image)
              } else if (field === 'explanation' && currentItem.explanationImages.length < 5) {
                currentItem.explanationImages.push(base64Image)
              } else {
                alert('Maximum of 5 images allowed per section')
                return prev
              }
            } else {
              // Initialize arrays for flashcards
              if (!currentItem.side1Images) currentItem.side1Images = []
              if (!currentItem.side2Images) currentItem.side2Images = []

              if (field === 'side1' && currentItem.side1Images.length < 5) {
                currentItem.side1Images.push(base64Image)
              } else if (field === 'side2' && currentItem.side2Images.length < 5) {
                currentItem.side2Images.push(base64Image)
              } else {
                alert('Maximum of 5 images allowed per section')
                return prev
              }
            }
            
            setHasChanges(true)
            setIsQuizSaved(false)
            setModifiedQuestions(prev => new Set([...prev, currentIndex]))
          }
          
          return updated
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = (field, index) => {
    if (selectedQuestionIndices.size > 0) {
      const currentIndex = Math.max(...Array.from(selectedQuestionIndices))
      
      setCurrentQuestions(prev => {
        const updated = [...prev]
        const currentItem = updated[currentIndex]
        
        if (currentItem) {
          if (createType === 'Quiz') {
            if (field === 'question' && currentItem.questionImages) {
              currentItem.questionImages.splice(index, 1)
            } else if (field === 'explanation' && currentItem.explanationImages) {
              currentItem.explanationImages.splice(index, 1)
            }
          } else {
            if (field === 'side1' && currentItem.side1Images) {
              currentItem.side1Images.splice(index, 1)
            } else if (field === 'side2' && currentItem.side2Images) {
              currentItem.side2Images.splice(index, 1)
            }
          }
          
          setHasChanges(true)
          setIsQuizSaved(false)
          setModifiedQuestions(prev => new Set([...prev, currentIndex]))
        }
        
        return updated
      })
    }
  }

  // Add useEffect for click outside handling
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('.create-dropdown')
      const createButton = document.querySelector('.create-dropdown-container button')
      
      if (showCreateOptions && 
          dropdown && 
          !dropdown.contains(event.target) && 
          !createButton.contains(event.target)) {
        setShowCreateOptions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCreateOptions])

  // Update the ImageThumbnail component
  const ImageThumbnail = ({ imageSrc, onRemove, field, index }) => {
    const [showPreview, setShowPreview] = useState(false)
    
    return (
      <div className="image-thumbnail-container">
        <div 
          className="image-thumbnail"
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
        >
          <img 
            src={imageSrc} 
            alt="Thumbnail" 
            className="thumbnail-img"
          />
          <button
            className="remove-image-button"
            onClick={() => onRemove(field, index)}
          >
            🗑️
          </button>
        </div>
        {showPreview && (
          <div className="image-preview-hover">
            <img 
              src={imageSrc} 
              alt="Preview" 
            />
          </div>
        )}
      </div>
    )
  }

  // Update the handleMainContentClick to be more specific
  const handleGlobalClick = (event) => {
    // Don't deselect if clicking within the right section or on specific interactive elements
    const isRightSection = event.target.closest('.right-section')
    const isToothButton = event.target.closest('.tooth-button')
    const isCreateButton = event.target.closest('.create-dropdown-container')
    const isImportButton = event.target.closest('.large-button')
    const isTab = event.target.closest('.tab')
    
    if (!isRightSection && !isToothButton && !isCreateButton && !isImportButton && !isTab) {
      setSelectedItem(null)
      setSelectedItems(new Set())
    }
  }

  // Add useEffect to handle the global click listener
  useEffect(() => {
    document.addEventListener('mousedown', handleGlobalClick)
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick)
    }
  }, [])

  const handleConfirmSave = async () => {
    try {
      await handleSave()
      resetCreateState()
      setShowConfirmModal(false)
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  const handleConfirmDiscard = () => {
    resetCreateState()
    setShowConfirmModal(false)
  }

  const handleConfirmCancel = () => {
    setShowConfirmModal(false)
  }

  return (
    <div className={`container ${isDarkMode ? 'dark' : 'light'}`} data-mode={mode}>
      {console.log('Mode:', mode)} {/* Debug log */}
      {console.log('EditingItem:', editingItem)} {/* Debug log */}
      {console.log('CreateType:', createType)} {/* Debug log */}
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
              <div className="button-container">
                <button 
                  className="back-button"
                  onClick={handleBack}
                >
                  {isNameEntered ? 'Back' : 'Cancel'}
                </button>
                {isNameEntered && hasChanges && !isQuizSaved && (
                  <button 
                    className="large-button save-button"
                    onClick={handleSave}
                  >
                    <span className="button-icon">
                      💾
                    </span>
                    Save
                  </button>
                )}
              </div>
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
                    if (isEditMode && e.target.value !== getBaseName(editingItem.name)) {
                      setHasChanges(true)
                      setIsQuizSaved(false)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && itemName.trim()) {
                      setIsNameConfirmed(true)
                      setShowEnterHint(false)
                      setIsNameEntered(true)
                      setHasChanges(true)

                      // Create a blank item for new quiz/deck
                      const blankItem = createType === 'Quiz'
                        ? {
                            question: '',
                            answers: [],
                            explanation: ''
                          }
                        : {
                            side1: '',
                            side2: ''
                        }

                      // Set editing item for new quiz/deck
                      setEditingItem({
                        name: `${itemName}_${createType === 'Quiz' ? 'quiz' : 'flash'}.jqz`,
                        content: JSON.stringify({ items: [] })
                      })

                      setCurrentQuestions(prev => {
                        const newQuestions = [...prev, blankItem]
                        const newIndex = newQuestions.length - 1
                        setSelectedQuestionIndices(new Set([newIndex]))

                        // Scroll to the new question after a short delay
                        setTimeout(() => {
                          const questionsList = document.querySelector('.questions-list')
                          const newQuestion = questionsList?.children[newIndex]
                          if (newQuestion) {
                            newQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }
                        }, 50)

                        return newQuestions
                      })

                      // Focus on the first input after a short delay
                      setTimeout(() => {
                        const side1Input = document.getElementById('side1')
                        if (side1Input) {
                          side1Input.focus()
                          side1Input.selectionStart = 0
                          side1Input.selectionEnd = 0
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
                    <button 
                      className="expand-button"
                      onClick={() => {
                        setExpandedInput('side1')
                        setExpandedContent(document.getElementById('side1').value)
                      }}
                    >
                      ⛶
                    </button>
                  </label>
                  <textarea 
                    ref={side1Ref}
                    id="side1"
                    className="input-box"
                    placeholder={`Enter your ${createType === 'Quiz' ? 'question' : 'first side'} here...`}
                    rows="4"
                    disabled={!isNameConfirmed || (isEditMode && selectedQuestionIndices.size === 0)}
                    onChange={(e) => checkContentChanges(e.target.value, 'side1')}
                  />
                  <div className="image-upload-section">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, createType === 'Quiz' ? 'question' : 'side1')}
                      style={{ display: 'none' }}
                      ref={questionImageInputRef}
                    />
                    <button
                      className="image-upload-button"
                      onClick={() => questionImageInputRef.current.click()}
                      disabled={!isNameConfirmed || 
                        (isEditMode && selectedQuestionIndices.size === 0) ||
                        (selectedQuestionIndices.size > 0 && 
                          currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.[
                            createType === 'Quiz' ? 'questionImages' : 'side1Images'
                          ]?.length >= 5)}
                    >
                      📷 Add Image
                      {selectedQuestionIndices.size > 0 && 
                        currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.[
                          createType === 'Quiz' ? 'questionImages' : 'side1Images'
                        ]?.length > 0 && 
                        ` (${currentQuestions[Math.max(...Array.from(selectedQuestionIndices))][
                          createType === 'Quiz' ? 'questionImages' : 'side1Images'
                        ].length}/5)`}
                    </button>
                    {selectedQuestionIndices.size > 0 && 
                      currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.[
                        createType === 'Quiz' ? 'questionImages' : 'side1Images'
                      ]?.map((imageSrc, index) => (
                        <ImageThumbnail
                          key={index}
                          imageSrc={imageSrc}
                          onRemove={handleRemoveImage}
                          field={createType === 'Quiz' ? 'question' : 'side1'}
                          index={index}
                        />
                      ))}
                  </div>
                </div>

                <div className="input-group answer-choices-group">
                  <label htmlFor="side2" className="answer-label">
                    {createType === 'Quiz' ? (
                      <>
                        Answer Choices:
                        <span className="correct-answer-hint">
                          Mark correct answer(s) with a ( * ) in front
                        </span>
                      </>
                    ) : 'Side 2:'}
                    <button 
                      className="expand-button"
                      onClick={() => {
                        setExpandedInput('side2')
                        setExpandedContent(document.getElementById('side2').value)
                      }}
                    >
                      ⛶
                    </button>
                  </label>
                  <textarea 
                    ref={side2Ref}
                    id="side2"
                    className="input-box"
                    placeholder={`Enter ${createType === 'Quiz' ? 'answer choices' : 'second side'} here...`}
                    rows="6"
                    disabled={!isNameConfirmed || (isEditMode && selectedQuestionIndices.size === 0)}
                    onChange={(e) => checkContentChanges(e.target.value, 'side2')}
                  />
                </div>

                {createType === 'Quiz' && (
                  <div className="input-group">
                    <label htmlFor="explanation">
                      Explanation:
                      <button 
                        className="expand-button"
                        onClick={() => {
                          setExpandedInput('explanation')
                          setExpandedContent(document.getElementById('explanation').value)
                        }}
                      >
                        ⛶
                      </button>
                    </label>
                    <textarea 
                      ref={explanationRef}
                      id="explanation"
                      className="input-box explanation-box"
                      placeholder="Enter optional explanation here..."
                      rows="3"
                      disabled={!isNameConfirmed || (isEditMode && selectedQuestionIndices.size === 0)}
                      onChange={(e) => checkContentChanges(e.target.value, 'explanation')}
                    />
                    <div className="image-upload-section">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'explanation')}
                        style={{ display: 'none' }}
                        ref={explanationImageInputRef}
                      />
                      <button
                        className="image-upload-button"
                        onClick={() => explanationImageInputRef.current.click()}
                        disabled={!isNameConfirmed || 
                          (isEditMode && selectedQuestionIndices.size === 0) ||
                          (selectedQuestionIndices.size > 0 && 
                            currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.explanationImages?.length >= 5)}
                      >
                        📷 Add Image
                        {selectedQuestionIndices.size > 0 && 
                          currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.explanationImages?.length > 0 && 
                          ` (${currentQuestions[Math.max(...Array.from(selectedQuestionIndices))].explanationImages.length}/5)`}
                      </button>
                      {selectedQuestionIndices.size > 0 && 
                        currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.explanationImages?.map((imageSrc, index) => (
                          <ImageThumbnail
                            key={index}
                            imageSrc={imageSrc}
                            onRemove={handleRemoveImage}
                            field="explanation"
                            index={index}
                          />
                        ))}
                    </div>
                  </div>
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
            {mode === 'create' ? null : (
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
                <span>{createType === 'Quiz' ? 'Questions' : 'Cards'}</span>
              </div>
              <div className="bank-container">
                {editingItem && (
                  <>
                    <div className="questions-list">
                      {currentQuestions.map((item, index) => (
                        <div
                          key={index}
                          className={`question-item ${selectedQuestionIndices.has(index) ? 'selected' : ''} ${modifiedQuestions.has(index) ? 'modified' : ''}`}
                          onClick={(e) => handleQuestionSelect(index, e)}
                          title={createType === 'Quiz' 
                            ? `${item.question || ''}\n\nAnswers:\n${Array.isArray(item.answers) ? item.answers.join('\n') : ''}\n${item.explanation ? `\nExplanation:\n${item.explanation}` : ''}`
                            : `${item.side1 || ''}\n\n${item.side2 || ''}`}
                        >
                          <span className="question-number">{index + 1}.</span>
                          <span className="question-preview">
                            {createType === 'Quiz'
                              ? (item.question?.length > 50 ? `${item.question.substring(0, 50)}...` : item.question)
                              : (item.side1?.length > 50 ? `${item.side1.substring(0, 50)}...` : item.side1)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="questions-controls">
                      <button 
                        className="add-question-button"
                        onClick={handleAddQuestion}
                        disabled={!isNameEntered}
                      >
                        <span className="plus-icon">+</span>
                        New
                      </button>
                      <button
                        className="remove-question-button"
                        onClick={handleRemoveQuestion}
                        disabled={selectedQuestionIndices.size === 0}
                      >
                        <span>🗑️</span>
                        Remove {selectedQuestionIndices.size} {createType === 'Quiz' ? 'Question' : 'Card'}
                        {selectedQuestionIndices.size > 1 ? 's' : ''}
                      </button>
                    </div>
                  </>
                )}
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

      {expandedInput && (
        <ExpandedInput
          inputId={expandedInput}
          content={expandedContent}
          onClose={() => {
            setExpandedInput(null);
            setExpandedContent('');
          }}
        />
      )}

      {showConfirmModal && (
        <ConfirmationModal
          onConfirm={handleConfirmSave}
          onCancel={handleConfirmCancel}
          onDiscard={handleConfirmDiscard}
        />
      )}

      {showQuizRunner && (
        <div className="quiz-runner-overlay">
          <QuizRunner 
            questions={JSON.parse(selectedItem.content).items}
            onClose={() => setShowQuizRunner(false)}
          />
        </div>
      )}
    </div>
  )
}

export default App
