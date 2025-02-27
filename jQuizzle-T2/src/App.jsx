import { useState, useRef, useEffect, Component } from 'react'
import './App.css'
import toothLogo from './assets/tooth-logo.svg'
import topGumLogo from './assets/top-gum-logo.svg'
import QuizRunner from './components/QuizRunner'
import FlashcardRunner from './components/FlashcardRunner'
import PracticeModeRunner from './components/PracticeModeRunner'

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

// Add a new WarningModal component outside of App component
const WarningModal = ({ message, onConfirm, onCancel, showCancel = false, confirmText = 'OK' }) => {
  return (
    <div className="warning-modal-overlay">
      <div className="warning-modal">
        <div className="warning-header">
          ⚠️ Warning
        </div>
        <div className="warning-message">
          {message.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="warning-buttons">
          {showCancel && (
            <button 
              className="warning-button secondary"
              onClick={onCancel}
            >
              Back
            </button>
          )}
          {onConfirm && (
            <button 
              className="warning-button primary"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Find the ExpandedInput component or add it if it doesn't exist
// This would typically be defined outside the App component

const ExpandedInput = ({ inputId, content, onClose }) => {
  const [expandedContent, setExpandedContent] = useState(content)
  
  const handleContentChange = (e) => {
    setExpandedContent(e.target.value)
  }
  
  const handleClose = () => {
    // Update the original input with the expanded content
    const originalInput = document.getElementById(inputId)
    if (originalInput) {
      originalInput.value = expandedContent
      // Trigger a change event to update state
      const event = new Event('change', { bubbles: true })
      originalInput.dispatchEvent(event)
    }
    onClose()
  }
  
  // Focus the textarea when the component mounts
  useEffect(() => {
    const textarea = document.getElementById('expanded-textarea')
    if (textarea) {
      textarea.focus()
    }
  }, [])
  
  return (
    <div className="expanded-input-overlay">
      <div className="expanded-input-container">
        <div className="expanded-header">
          <h3>{inputId === 'side1' ? 'Question' : inputId === 'side2' ? 'Answer Choices' : 'Explanation'}</h3>
        </div>
        <textarea 
          id="expanded-textarea"
          className="expanded-input"
          data-input-type={inputId}
          value={expandedContent}
          onChange={handleContentChange}
        />
        <div className="expanded-controls">
          <button className="expanded-button expanded-back" onClick={handleClose}>
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

// Add this class component somewhere before the App function
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Quiz Runner Error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary">
          <h2>Something went wrong loading the quiz.</h2>
          <p>Error: {this.state.error && this.state.error.toString()}</p>
          <button onClick={() => this.props.onClose()}>Close</button>
        </div>
      );
    }

    return this.props.children;
  }
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
  const fileInputRef = useRef(null)
  const [currentQuizName, setCurrentQuizName] = useState('')
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const [warningCallback, setWarningCallback] = useState(null)
  const [showWarningCancel, setShowWarningCancel] = useState(false)
  const [warningConfirmText, setWarningConfirmText] = useState('OK')
  const [warningCancelCallback, setWarningCancelCallback] = useState(null)
  const [isFlashcardRunnerActive, setIsFlashcardRunnerActive] = useState(false)
  const [currentFlashcardDeck, setCurrentFlashcardDeck] = useState(null)
  const [isPracticeModeEnabled, setIsPracticeModeEnabled] = useState(false)
  const [showPracticeModeRunner, setShowPracticeModeRunner] = useState(false)

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
            cardCount: items.length, // Add cardCount for flashcards
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
            cardCount: items.length, // Add cardCount for flashcards
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

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    await handleFileDrop(files)
    // Reset the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleToothClick = () => {
    console.log('Tooth clicked! Selected Item:', selectedItem)
    
    if (selectedItems.size > 1) {
      if (!isMessageChanging) {
        setIsMessageChanging(true)
        setMessage("Make sure only 1 quiz or deck is selected!")
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
    
    if (!selectedItem) {
      // No item selected
      if (!isMessageChanging) {
        setIsMessageChanging(true)
        setMessage("Select a quiz or deck first!")
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
    
    // Handle based on item type
    const itemName = selectedItem.name.toLowerCase();
    console.log('Selected item name:', itemName);
    
    // Check if it's a quiz
    if (activeTab === 'quiz' || 
        itemName.includes('_quiz') || 
        itemName.includes('quiz_')) {
      console.log('Loading quiz:', selectedItem);
      handleRunQuiz(selectedItem);
    } 
    // Check if it's a flashcard deck
    else if (activeTab === 'flashcard' || 
            itemName.includes('_flash') || 
            itemName.includes('flash_') || 
            itemName.includes('_deck') || 
            itemName.includes('deck_')) {
      console.log('Loading flashcard deck:', selectedItem);
      handleFlashcardDeckLaunch(selectedItem);
    }
    else {
      console.log('Unable to determine item type:', selectedItem);
      // Show a message indicating we can't determine the type
      if (!isMessageChanging) {
        setIsMessageChanging(true)
        setMessage("Unable to determine item type. Try renaming it with _quiz or _deck suffix.")
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
    }
  }

  const getBaseName = (filename, forComparison = false) => {
    if (forComparison) {
      // For comparing names, remove all spaces and normalize to lowercase
      return filename
        .replace(/\s+/g, '')  // Remove all spaces
        .replace(/[_-](?:quiz|flash|deck)\.(txt|csv|jqz)$/i, '') // Added 'deck' to the pattern
        .trim()
        .toLowerCase()  // Case insensitive comparison
    }
    
    // For display/general use, just remove the type suffix and extension
    // but preserve the original case
    return filename
      .replace(/[_-](?:quiz|flash|deck)\.(txt|csv|jqz)$/i, '') // Added 'deck' to the pattern
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
    console.log('Item clicked:', item)
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
    console.log(`Double-clicked ${type} item:`, item)
    
    try {
      // Parse the content
      let parsedContent
      try {
        if (typeof item.content === 'string') {
          parsedContent = JSON.parse(item.content)
        } else {
          parsedContent = item
        }
      } catch (error) {
        console.error('Error parsing content:', error)
        parsedContent = item
      }
      
      // Extract the items
      let items = []
      if (parsedContent && parsedContent.items) {
        items = parsedContent.items
      } else if (Array.isArray(parsedContent)) {
        items = parsedContent
      } else if (item.items) {
        items = item.items
      }
      
      // Enter edit mode
      setMode('create')
      setCreateType(type === 'quiz' ? 'Quiz' : 'Flashcard')
      setEditingItem(item)
      setIsEditMode(true)
      setItemName(getBaseName(item.name))
      setIsNameEntered(true)
      setIsNameConfirmed(true)
      setCurrentQuestions(items)
      setOriginalQuestions([...items])
      setModifiedQuestions(new Set())
      setHasChanges(false)
      setSelectedQuestionIndices(new Set())

      // Clear input values
      setInputValues({
        side1: '',
        side2: '',
        explanation: ''
      })
    } catch (error) {
      console.error('Error opening item for editing:', error)
      alert('Error opening the item for editing. The file might be corrupted.')
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
    console.log('Handling item selection:', item)
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
    setSelectedItem(item) // Directly set selectedItem here
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
    // Check if the current selected question is valid before adding a new one
    if (createType === 'Quiz' && selectedQuestionIndices.size > 0) {
      const currentIndex = Math.max(...Array.from(selectedQuestionIndices))
      const currentQuestion = currentQuestions[currentIndex]
      
      // Only validate if the question has content (not blank)
      if (currentQuestion && (currentQuestion.question?.trim() || 
                              (Array.isArray(currentQuestion.answers) && 
                               currentQuestion.answers.some(a => a.trim())))) {
        const errors = validateQuizQuestion(currentQuestion, currentIndex)
        
        if (errors.length > 0) {
          // Use custom warning with just a back option
          showWarning(
            `${errors.join('\n\n')}\n\nPlease fix these issues before adding a new question.`,
            null,
            true // Show cancel/back button only
          )
          return
        }
      }
    }
    
    // If no validation issues, add the question directly
    addNewQuestion()
  }

  const validateQuizQuestion = (question, index) => {
    const errors = []
    
    const answers = Array.isArray(question.answers) ? question.answers.filter(a => a.trim()) : []
    
    // Check if there are at least 2 answer options
    if (answers.length < 2) {
      errors.push(`The question requires at least 2 answer choices.`)
    }
    
    // Check if at least one answer is marked with *
    if (!answers.some(answer => answer.trim().startsWith('*'))) {
      errors.push(`At least one answer must be marked with a *`)
    }
    
    // Check for duplicate answer choices (ignoring the asterisk)
    const normalizedAnswers = answers.map(answer => answer.trim().replace(/^\*/, ''))
    const uniqueAnswers = new Set(normalizedAnswers)
    
    if (uniqueAnswers.size < normalizedAnswers.length) {
      errors.push(`Duplicate answer choices detected.`)
    }
    
    return errors
  }

  const handleSave = async () => {
    if (currentQuestions.length === 0) {
      showWarning('Please add at least one question or flashcard before saving.', null, true)
      return Promise.reject('No questions to save')
    }

    // Validate questions if this is a Quiz
    if (createType === 'Quiz') {
      const allErrors = []
      
      currentQuestions.forEach((item, index) => {
        const errors = validateQuizQuestion(item, index)
        if (errors.length > 0) {
          allErrors.push(`Question ${index + 1}: ${errors.join(' ')}`)
        }
      })
      
      if (allErrors.length > 0) {
        showWarning(`Please fix the following issues before saving:\n\n${allErrors.join('\n')}`, null, true)
        return Promise.reject('Invalid quiz questions')
      }
    }

    const cleanItemName = itemName.trim()

    // Fix: Use '_flash' for Deck type, not '_deck'
    const typeString = createType === 'Quiz' ? '_quiz' : '_flash'
    const fileName = `${cleanItemName}${typeString}.jqz`

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
        cardCount: currentQuestions.length,
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
              
              // Update the answers without showing warnings
              // (Warnings will be shown when saving or adding a new question)
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

  // Update the showWarning function to support custom button text and callback
  const showWarning = (message, callback = null, showCancel = false, confirmText = 'OK', cancelCallback = null) => {
    setWarningMessage(message)
    setWarningCallback(() => callback)
    setShowWarningCancel(showCancel)
    setWarningConfirmText(confirmText)
    setWarningCancelCallback(() => cancelCallback)
    setShowWarningModal(true)
  }

  // Extract the question adding logic to a separate function
  const addNewQuestion = () => {
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

  // Add a dedicated method to launch the flashcard runner
  const handleFlashcardDeckLaunch = (deck) => {
    console.log('Launching flashcard deck:', deck)
    
    try {
      // Get the deck content
      const content = deck.content
      
      // Parse the content
      let parsedContent
      try {
        if (typeof content === 'string') {
          parsedContent = JSON.parse(content)
        } else {
          parsedContent = content
        }
      } catch (error) {
        console.error('Error parsing deck content:', error)
        // If parsing fails, try to use the raw content
        parsedContent = content
      }
      
      // Extract the cards from the parsed content
      let cards = []
      if (parsedContent && parsedContent.items) {
        cards = parsedContent.items
      } else if (Array.isArray(parsedContent)) {
        // If content is directly an array
        cards = parsedContent
      } else if (deck.items) {
        // If items are directly on the deck object
        cards = deck.items
      }
      
      console.log('Extracted cards:', cards)
      
      // Set up the flashcard runner
      setCurrentFlashcardDeck({
        name: getBaseName(deck.name),
        cards: cards
      })
      setIsFlashcardRunnerActive(true)
    } catch (error) {
      console.error('Error preparing flashcard deck:', error)
      alert('Error preparing the flashcard deck. The file might be corrupted.')
    }
  }
  
  // Add a close handler for the flashcard runner
  const handleCloseFlashcardRunner = () => {
    console.log('Closing flashcard runner')
    setIsFlashcardRunnerActive(false)
    setCurrentFlashcardDeck(null)
  }

  // Let's update the handleRunQuiz function to fix the blank screen issue
  const handleRunQuiz = (quizBank) => {
    console.log('Running quiz bank:', quizBank);
    
    try {
      // Parse the content
      let parsedContent;
      try {
        if (typeof quizBank.content === 'string') {
          parsedContent = JSON.parse(quizBank.content);
        } else {
          parsedContent = quizBank;
        }
      } catch (error) {
        console.error('Error parsing quiz content:', error);
        // If parsing fails, try to use the raw content
        parsedContent = quizBank;
      }
      
      // Get quiz name from filename
      const quizName = getBaseName(quizBank.name);
      console.log('Quiz name:', quizName);
      
      // Extract the questions from the parsed content
      let questions = [];
      if (parsedContent && parsedContent.items) {
        questions = parsedContent.items;
      } else if (Array.isArray(parsedContent)) {
        questions = parsedContent;
      } else if (quizBank.items) {
        questions = quizBank.items;
      }
      
      console.log('Raw parsed questions:', questions);
      
      // Filter out non-objects and log invalid entries
      const validQuestions = questions.filter(q => {
        if (typeof q !== 'object' || q === null) {
          console.warn('Invalid question detected:', q);
          return false;
        }
        return true;
      });
      
      // Process questions to ensure correct format
      const processedQuestions = validQuestions.map(q => {
        // Make sure correct answers are properly identified
        if (!q.correct && Array.isArray(q.answers)) {
          // If correct answers are marked with asterisks
          const correct = [];
          const processedAnswers = [];
          
          q.answers.forEach(answer => {
            if (typeof answer === 'string' && answer.startsWith('*')) {
              const cleanAnswer = answer.substring(1);
              processedAnswers.push(cleanAnswer);
              correct.push(cleanAnswer);
            } else if (typeof answer === 'string') {
              processedAnswers.push(answer);
            }
          });
          
          return {
            ...q,
            answers: processedAnswers,
            correct: correct,
            explanation: q.explanation || 'No explanation provided.'
          };
        }
        
        // If the question is already properly formatted
        return {
          ...q,
          explanation: q.explanation || 'No explanation provided.'
        };
      });
      
      // Check if we have valid questions
      if (!processedQuestions || processedQuestions.length === 0) {
        throw new Error('No valid questions found in the quiz');
      }
      
      // Shuffle the questions
      const shuffledQuestions = [...processedQuestions].sort(() => Math.random() - 0.5);
      
      // For each question, shuffle the answers and create an array of answer objects
      // with IDs to track them
      const questionsWithShuffledAnswers = shuffledQuestions.map(q => {
        // Only process if it has answers
        if (Array.isArray(q.answers) && q.answers.length > 0) {
          // Create answer objects with IDs
          const answersWithIds = q.answers.map((answer, idx) => ({
            id: idx,
            text: answer,
          }));
          
          // Create an array of correct IDs
          const correctIds = [];
          if (Array.isArray(q.correct)) {
            q.correct.forEach(correctAnswer => {
              const idx = q.answers.findIndex(a => a === correctAnswer);
              if (idx !== -1) {
                correctIds.push(idx);
              }
            });
          }
          
          // Shuffle the answers
          const shuffledAnswers = [...answersWithIds].sort(() => Math.random() - 0.5);
          
          // Map the shuffled IDs to the original correct IDs
          const shuffledCorrectIds = shuffledAnswers
            .filter(a => correctIds.includes(a.id))
            .map(a => shuffledAnswers.findIndex(sa => sa.id === a.id));
          
          // Return the question with shuffled answers
          return {
            ...q,
            originalAnswers: q.answers,
            shuffledAnswers: shuffledAnswers.map(a => a.text),
            shuffledCorrectIds: shuffledCorrectIds,
          };
        }
        
        return q;
      });
      
      console.log('Processed and shuffled questions for quiz runner:', questionsWithShuffledAnswers);
      
      // Set up the appropriate runner based on mode
      setCurrentQuestions(questionsWithShuffledAnswers);
      setCurrentQuizName(quizName);
      
      // Launch either practice mode or regular quiz mode based on setting
      if (isPracticeModeEnabled) {
        setShowPracticeModeRunner(true);
      } else {
        setShowQuizRunner(true);
      }
    } catch (error) {
      console.error('Error preparing quiz:', error);
      alert('Error preparing the quiz. The file might be corrupted.');
    }
  };

  // Add function to handle close of practice mode runner
  const handleClosePracticeModeRunner = () => {
    setShowPracticeModeRunner(false);
  }
  
  // Add function to toggle practice mode
  const togglePracticeMode = () => {
    setIsPracticeModeEnabled(!isPracticeModeEnabled);
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

                {/* Only show image upload for flashcards, not for quiz answer choices */}
                {createType !== 'Quiz' && (
                  <div className="image-upload-section">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'side2')}
                      style={{ display: 'none' }}
                      ref={answerImageInputRef}
                    />
                    <button
                      className="image-upload-button"
                      onClick={() => answerImageInputRef.current.click()}
                      disabled={!isNameConfirmed || 
                        (isEditMode && selectedQuestionIndices.size === 0) ||
                        (selectedQuestionIndices.size > 0 && 
                          currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.side2Images?.length >= 5)}
                    >
                      📷 Add Image
                      {selectedQuestionIndices.size > 0 && 
                        currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.side2Images?.length > 0 && 
                        ` (${currentQuestions[Math.max(...Array.from(selectedQuestionIndices))].side2Images.length}/5)`}
                    </button>
                    {selectedQuestionIndices.size > 0 && 
                      currentQuestions[Math.max(...Array.from(selectedQuestionIndices))]?.side2Images?.map((imageSrc, index) => (
                        <ImageThumbnail
                          key={index}
                          imageSrc={imageSrc}
                          onRemove={handleRemoveImage}
                          field="side2"
                          index={index}
                        />
                      ))}
                  </div>
                )}

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
              <div className="tooth-container">
                {selectedItem && selectedItems.size === 1 && (
                  <div className="selected-item-name">
                    {getBaseName(selectedItem.name)}
                  </div>
                )}
                <button 
                  className="tooth-button"
                  onClick={handleToothClick}
                  aria-label="Tooth Button"
                >
                  <img src={toothLogo} className="tooth-logo" alt="Tooth Logo" />
                </button>
              </div>
              <div className={`message-bubble ${isMessageFading ? 'fade-out' : ''}`}>
                {message}
              </div>
              <h1>jQuizzle-T2</h1>
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
                    ref={fileInputRef}
                    type="file"
                    id="import-file-upload"
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
                  <>
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

                    <div className={`bank-container ${isDraggingOver ? 'dragging-over' : ''}`}>
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

                    {/* Add Practice Mode toggle after bank-container */}
                    <div className="bottom-controls-container">
                      <div className="practice-mode-toggle-container">
                        <button 
                          className={`practice-mode-toggle ${isPracticeModeEnabled ? 'active' : ''}`}
                          onClick={togglePracticeMode}
                          title={isPracticeModeEnabled ? "Practice Mode Enabled" : "Regular Quiz Mode"}
                        >
                          <span className="practice-mode-icon">🏋️</span>
                          <span className="practice-mode-text">Practice Mode</span>
                          <div className={`toggle-switch ${isPracticeModeEnabled ? 'active' : ''}`}>
                            <div className="toggle-slider"></div>
                          </div>
                        </button>
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
                    </div>
                  </>
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
          <ErrorBoundary onClose={() => setShowQuizRunner(false)}>
            <QuizRunner 
              questions={currentQuestions}
              quizName={currentQuizName}
              onClose={() => setShowQuizRunner(false)}
              isDarkMode={isDarkMode}
              onThemeToggle={toggleTheme}
            />
          </ErrorBoundary>
        </div>
      )}

      {showWarningModal && (
        <WarningModal
          message={warningMessage}
          onConfirm={warningCallback}
          onCancel={() => {
            if (warningCancelCallback) warningCancelCallback()
            else setShowWarningModal(false)
          }}
          showCancel={showWarningCancel}
          confirmText={warningConfirmText}
        />
      )}

      {isFlashcardRunnerActive && currentFlashcardDeck && (
        <div className="flashcard-runner-overlay">
          <FlashcardRunner 
            cards={currentFlashcardDeck.cards}
            deckName={currentFlashcardDeck.name}
            onClose={handleCloseFlashcardRunner}
            isDarkMode={isDarkMode}
            onThemeToggle={toggleTheme}
          />
        </div>
      )}

      {/* Add Practice Mode runner */}
      {showPracticeModeRunner && (
        <div className="practice-mode-overlay">
          <PracticeModeRunner
            questions={currentQuestions}
            quizName={currentQuizName}
            onClose={handleClosePracticeModeRunner}
            isDarkMode={isDarkMode}
            onThemeToggle={toggleTheme}
          />
        </div>
      )}
    </div>
  )
}

export default App
