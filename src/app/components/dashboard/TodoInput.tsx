import React, { useState, useRef, useEffect } from "react";
import {
  PlusCircle,
  Calendar,
  Tag,
  ChevronDown,
  Star,
  X,
  Clock,
  Check,
  Terminal,
  Sparkles
} from "lucide-react";
import * as chrono from "chrono-node";
import { ViewType } from "../../Types/types";

interface TodoInputProps {
  showTaskInput: boolean;
  setShowTaskInput: (show: boolean) => void;
  handleAddTodo: (taskTitle: string, deadline: string, recurring?: string, project?: string, priority?: number) => void;
  activeView: ViewType; 
  activeProject: string | null;
}

interface ParsedPreview {
  title: string;
  date: string;
  recurring?: string;
  project?: string;
}

const TodoInput: React.FC<TodoInputProps> = ({
  showTaskInput,
  setShowTaskInput,
  handleAddTodo,
  activeView, 
}) => {
  const [inputValue, setInputValue] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedPreview | null>(null);
  const [nlpEnabled, setNlpEnabled] = useState(true);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [priority, setPriority] = useState<number>(4);
  const [project, setProject] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (activeView === 'project-personal') {
      setProject("Personal");
    } else if (activeView === 'project-work') {
      setProject("Work");
    } else if (activeView === 'project-study') {
      setProject("Study");
    } else if (activeView === 'project-health') {
      setProject("Health");
    }
  }, [activeView]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProjectDropdown(false);
      }

      if (
        formRef.current &&
        !formRef.current.contains(event.target as Node) &&
        expanded
      ) {
        setExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  const recurringPatterns: { [key: string]: string } = {
    "every day": "daily",
    "everyday": "daily",
    "daily": "daily",
    "every week": "weekly",
    "weekly": "weekly",
    "every month": "monthly",
    "monthly": "monthly",
    "every year": "yearly",
    "yearly": "yearly",
    "every monday": "weekly",
    "every tuesday": "weekly",
    "every wednesday": "weekly",
    "every thursday": "weekly",
    "every friday": "weekly",
    "every saturday": "weekly",
    "every sunday": "weekly",
  };

  const projectPatterns: { [key: string]: string } = {
    "#work": "Work",
    "#personal": "Personal",
    "#study": "Study",
    "#health": "Health",
    "for work": "Work",
    "for personal": "Personal",
    "for study": "Study",
    "for health": "Health",
  };

  const updatePreview = (input: string) => {
    if (!input.trim() || !nlpEnabled) {
      setParsedPreview(null);
      return;
    }

    const processedInput = processInput(input);
    setParsedPreview(processedInput);

    if (processedInput.date) {
      setDeadline(new Date(processedInput.date));
    }
    
    if (processedInput.project) {
      setProject(processedInput.project);
    }
  };

  const processInput = (input: string): ParsedPreview => {
    let detectedRecurring = "";
    let detectedProject = "";
    let textWithoutMetadata = input;
  
    for (const pattern in recurringPatterns) {
      if (input.toLowerCase().includes(pattern)) {
        detectedRecurring = recurringPatterns[pattern];
        textWithoutMetadata = textWithoutMetadata.toLowerCase().replace(pattern, "").trim();
        break;
      }
    }
  
    for (const pattern in projectPatterns) {
      if (input.toLowerCase().includes(pattern)) {
        detectedProject = projectPatterns[pattern];
        textWithoutMetadata = textWithoutMetadata.toLowerCase().replace(pattern, "").trim();
        break;
      }
    }
  
    const refDate = new Date();
    const parsedResults = chrono.parse(textWithoutMetadata, refDate);
  
    if (parsedResults.length === 0) {
      return { 
        title: input, 
        date: "", 
        recurring: detectedRecurring || undefined,
        project: detectedProject || undefined
      };
    }
  
    const dateResult = parsedResults[0];
    const dateText = dateResult.text;
    let parsedDate = dateResult.start.date();
  
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    const lowerInput = textWithoutMetadata.toLowerCase();
    const weekdays = [
      { name: "sunday", index: 0 },
      { name: "monday", index: 1 },
      { name: "tuesday", index: 2 },
      { name: "wednesday", index: 3 },
      { name: "thursday", index: 4 },
      { name: "friday", index: 5 },
      { name: "saturday", index: 6 },
    ];
  
    for (const day of weekdays) {
      if (lowerInput.includes(day.name)) {
        let daysToAdd = (day.index - dayOfWeek + 7) % 7;
  
        if (daysToAdd === 0 && parsedDate < today) {
          daysToAdd = 7; 
        }
  
        parsedDate = new Date(today);
        parsedDate.setDate(today.getDate() + daysToAdd);
  
        parsedDate.setHours(
          dateResult.start.get("hour") ?? 9, 
          dateResult.start.get("minute") ?? 0,
          0,
          0
        );
        break;
      }
    }
  
    const formattedDate = parsedDate.toISOString();
    let taskTitle = textWithoutMetadata.replace(dateText, "").trim();
  
    return {
      title: taskTitle,
      date: formattedDate,
      recurring: detectedRecurring || undefined,
      project: detectedProject || undefined
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    let taskProject = project;
    if (!taskProject) {
      if (activeView === 'project-personal') {
        taskProject = 'Personal';
      } else if (activeView === 'project-work') {
        taskProject = 'Work';
      } else if (activeView === 'project-study') {
        taskProject = 'Study';
      } else if (activeView === 'project-health') {
        taskProject = 'Health';
      }
    }

    if (nlpEnabled && parsedPreview) {
      handleAddTodo(
        parsedPreview.title || inputValue, 
        parsedPreview.date || (deadline ? deadline.toISOString() : ""), 
        parsedPreview.recurring,
        parsedPreview.project || taskProject || undefined,
        priority
      );
    } else {
      handleAddTodo(
        inputValue, 
        deadline ? deadline.toISOString() : "", 
        undefined,
        taskProject || undefined,
        priority
      );
    }
    
    resetForm();
  };

  const resetForm = () => {
    setInputValue("");
    setDeadline(null);
    setPriority(4);
    
    if (!activeView.startsWith('project-')) {
      setProject(null);
    }
    
    setParsedPreview(null);
    setShowDeadlinePicker(false);
    setShowProjectDropdown(false);
    setExpanded(false);
    setShowTaskInput(false);
  };

  const formatPreviewDate = (dateString: string) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const getPriorityColor = (level: number) => {
    switch (level) {
      case 1:
        return "text-red-400 bg-red-500/20";
      case 2:
        return "text-orange-400 bg-orange-500/20";
      case 3:
        return "text-yellow-400 bg-yellow-500/20";
      case 4:
        return "text-gray-400 bg-gray-600/40";
      default:
        return "text-gray-400 bg-gray-600/40";
    }
  };

  const formatDeadline = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  if (!showTaskInput) {
    return (
      <div className="mb-8 flex">
        <button
          onClick={() => setShowTaskInput(true)}
          className="flex items-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium transition-all duration-200 rounded-lg shadow-lg shadow-indigo-500/30"
        >
          <PlusCircle size={18} className="mr-2" />
          Add New Task
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 max-w-3xl mx-auto">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`bg-gray-900 rounded-xl border ${
          expanded
            ? "border-indigo-500/50 shadow-lg shadow-indigo-500/20"
            : "border-gray-800"
        } transition-all duration-300 transform ${expanded ? "scale-102" : ""}`}
      >
        {/* Smart input bar with NLP toggle */}
        <div className="relative flex items-center">
          <div className="relative">
            <div
              className="p-4 text-indigo-400 transition-colors duration-200 hover:text-indigo-300 cursor-pointer group"
              onClick={() => {
                inputRef.current?.focus();
                setExpanded(true);
              }}
            >
              <PlusCircle size={22} className="stroke-[1.5px]" />
              
              {/* Tooltip */}
              <div className="absolute left-0 bottom-full mb-2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48">
                Add task 
                {nlpEnabled ? " (smart input enabled)" : ""}
              </div>
            </div>
          </div>
          
          <div className="flex-grow relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                updatePreview(e.target.value);
              }}
              placeholder={nlpEnabled ? 
                activeView.startsWith('project-') 
                  ? `Add task for ${project} project...` 
                  : "Add task, use natural language" 
                : "Add a new task..."}
              className="w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none text-lg font-medium"
              onFocus={() => setExpanded(true)}
            />
            
            {/* Smart features button */}
            <button
              type="button"
              onClick={() => setNlpEnabled(!nlpEnabled)}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full ${
                nlpEnabled ? "bg-indigo-500/20 text-indigo-300" : "bg-gray-700/50 text-gray-400"
              } transition-colors`}
              title={nlpEnabled ? "Smart input enabled" : "Smart input disabled"}
            >
              <Sparkles size={16} />
            </button>
          </div>
          
          <button
            type="submit"
            className={`px-6 py-4 ${
              inputValue.trim()
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            } font-medium transition-all duration-200 rounded-r-xl`}
            disabled={!inputValue.trim()}
          >
            {inputValue.trim() ? <Check className="stroke-[2px]" /> : "Add"}
          </button>
        </div>

        {/* Preview parsed task */}
        {nlpEnabled && parsedPreview && (parsedPreview.date || parsedPreview.recurring || parsedPreview.project) && (
          <div className="px-4 py-2 border-t border-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Terminal size={14} className="text-indigo-400" />
              <span className="text-indigo-300 font-medium">Smart input detected:</span>
              
              {parsedPreview.date && (
                <span className="flex items-center bg-blue-500/10 text-blue-300 px-2 py-1 rounded-md text-xs">
                  <Calendar size={12} className="mr-1" />
                  {formatPreviewDate(parsedPreview.date)}
                </span>
              )}
              
              {parsedPreview.recurring && (
                <span className="flex items-center bg-green-500/10 text-green-300 px-2 py-1 rounded-md text-xs">
                  <Clock size={12} className="mr-1" />
                  {parsedPreview.recurring}
                </span>
              )}
              
              {parsedPreview.project && (
                <span className="flex items-center bg-purple-500/10 text-purple-300 px-2 py-1 rounded-md text-xs">
                  <Tag size={12} className="mr-1" />
                  {parsedPreview.project}
                </span>
              )}
            </div>
          </div>
        )}

        {expanded && (
          <div className="flex flex-wrap items-center px-4 pb-4 border-t border-gray-700/30 pt-3 gap-3">
            {/* Priority selector */}
            <div className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-gray-700/50 text-gray-300">
              <span className="text-xs mr-2">Priority:</span>
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriority(level)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                    priority === level
                      ? getPriorityColor(level)
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                  title={`Priority ${level}`}
                >
                  <Star
                    size={14}
                    fill={priority === level ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>

            {/* Project selector - Highlight if in a project view */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${
                  project
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-gray-700/50 hover:bg-gray-700/80 text-gray-300"
                } text-sm transition-colors`}
              >
                <Tag size={14} />
                <span>{project || "Project"}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    showProjectDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showProjectDropdown && (
                <div className="absolute z-50 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-visible">
                  {/* Fixed dropdown menu */}
                  <div className="p-2 border-b border-gray-700 text-xs text-gray-400 uppercase">
                    Select Project
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setProject("Personal");
                        setShowProjectDropdown(false);
                      }}
                      className={`flex items-center w-full px-3 py-2 hover:bg-indigo-500/20 text-left text-sm ${
                        project === "Personal"
                          ? "text-indigo-300 bg-indigo-500/10"
                          : "text-white"
                      } transition-colors`}
                    >
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mr-2"></div>
                      Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProject("Work");
                        setShowProjectDropdown(false);
                      }}
                      className={`flex items-center w-full px-3 py-2 hover:bg-indigo-500/20 text-left text-sm ${
                        project === "Work"
                          ? "text-indigo-300 bg-indigo-500/10"
                          : "text-white"
                      } transition-colors`}
                    >
                      <div className="w-2 h-2 rounded-full bg-purple-400 mr-2"></div>
                      Work
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProject("Study");
                        setShowProjectDropdown(false);
                      }}
                      className={`flex items-center w-full px-3 py-2 hover:bg-indigo-500/20 text-left text-sm ${
                        project === "Study"
                          ? "text-indigo-300 bg-indigo-500/10"
                          : "text-white"
                      } transition-colors`}
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-400 mr-2"></div>
                      Study
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProject("Health");
                        setShowProjectDropdown(false);
                      }}
                      className={`flex items-center w-full px-3 py-2 hover:bg-indigo-500/20 text-left text-sm ${
                        project === "Health"
                          ? "text-indigo-300 bg-indigo-500/10"
                          : "text-white"
                      } transition-colors`}
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                      Health
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProject(null);
                        setShowProjectDropdown(false);
                      }}
                      className="flex items-center w-full px-3 py-2 hover:bg-red-500/20 text-left text-sm text-gray-300 transition-colors"
                    >
                      <X size={14} className="mr-2" />
                      None
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Deadline picker toggle */}
            <button
              type="button"
              onClick={() => setShowDeadlinePicker(!showDeadlinePicker)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${
                deadline
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-gray-700/50 hover:bg-gray-700/80 text-gray-300"
              } text-sm transition-colors`}
            >
              <Calendar size={14} />
              <span>
                {deadline ? formatDeadline(deadline) : "Set deadline"}
              </span>
              {deadline && (
                <X
                  size={14}
                  className="ml-1 text-gray-400 hover:text-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeadline(null);
                    setShowDeadlinePicker(false);
                  }}
                />
              )}
            </button>
            
            {/* Cancel button */}
            <button
              type="button"
              onClick={() => resetForm()}
              className="ml-auto text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Deadline picker */}
        {showDeadlinePicker && (
          <div className="px-4 pb-4 animate-fadeIn">
            <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600/50">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-gray-300">
                  Set deadline:
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      today.setHours(23, 59, 0, 0);
                      setDeadline(today);
                    }}
                    className="text-xs px-2 py-1 bg-gray-600/50 hover:bg-gray-600 rounded text-gray-300 flex items-center"
                  >
                    <Clock size={10} className="mr-1" />
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(23, 59, 0, 0);
                      setDeadline(tomorrow);
                    }}
                    className="text-xs px-2 py-1 bg-gray-600/50 hover:bg-gray-600 rounded text-gray-300"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
              <input
                type="datetime-local"
                className="bg-gray-600 text-white rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) =>
                  setDeadline(e.target.value ? new Date(e.target.value) : null)
                }
                min={new Date().toISOString().slice(0, 16)}
                value={
                  deadline
                    ? new Date(
                        deadline.getTime() -
                          deadline.getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowDeadlinePicker(false)}
                  className="text-xs px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded text-white transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
      
      {/* Quick help for natural language input */}
      {nlpEnabled && expanded && (
        <div className="mt-2 text-xs text-gray-400 px-1">
          <p className="flex items-center">
            <Sparkles size={12} className="text-indigo-400 mr-1" />
            <span>
              Try typing: "Call mom tomorrow at 3pm #personal" or "Submit report by Friday every week for work"
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default TodoInput;