import React, { useState } from 'react';
import { Star, Tag, Calendar, Clock, Edit2, Trash2, CheckCircle, Save, X } from 'lucide-react';
import { Todo } from '../../Types/types';

interface TodoItemProps {
  todo: Todo;
  handleToggleTodo: (id: string) => void | Promise<void>; 
  handleDeleteTodo: (id: string) => void | Promise<void>;
  handleUpdatePriority?: (id: string, priority: number) => void | Promise<void>;
  handleUpdateProject?: (id: string, project: string) => void | Promise<void>;
  handleEditTodo?: (id: string, text: string) => void | Promise<void>;
}

const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, 
  handleToggleTodo, 
  handleDeleteTodo,
  handleUpdatePriority,
  handleUpdateProject,
  handleEditTodo
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  
  const formatDeadline = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  const isDeadlineApproaching = () => {
    if (!todo.deadline) return false;
    const now = new Date();
    const timeDiff = todo.deadline.getTime() - now.getTime();
    return timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000;
  };
  
  const isDeadlinePast = () => {
    if (!todo.deadline) return false;
    return todo.deadline < new Date();
  };

  const getBorderColor = () => {
    if (todo.completed) return 'border-green-500/30';
    if (isDeadlinePast()) return 'border-red-500/50';
    if (isDeadlineApproaching()) return 'border-yellow-500/50';
    if (todo.priority <= 2) return 'border-purple-500/30';
    return 'border-gray-700/50';
  };

  const handleSaveEdit = () => {
    if (editText.trim() !== '' && handleEditTodo) {
      handleEditTodo(todo.id, editText);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  const renderPriorityIndicator = () => {
    if (todo.priority > 2) return null;
    
    return (
      <button 
        onClick={() => handleUpdatePriority && handleUpdatePriority(todo.id, todo.priority <= 1 ? 4 : todo.priority - 1)}
        className={`text-yellow-500 ${todo.priority === 1 ? 'opacity-100' : 'opacity-80'} hover:scale-110 transition-all`}
        title={`Priority ${todo.priority}`}
      >
        <Star size={16} fill="currentColor" />
      </button>
    );
  };

  return (
    <li
      className={`bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border ${getBorderColor()} hover:border-indigo-500/50 transition-all duration-300 group ${isHovered ? 'shadow-lg shadow-indigo-500/5 scale-[1.01]' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isEditing ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggleTodo(todo.id)}
            className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              todo.completed 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-500 hover:border-indigo-400'
            }`}
          >
            {todo.completed && (
              <CheckCircle size={14} className="text-white" />
            )}
            {!todo.completed && isHovered && (
              <div className="absolute inset-0 bg-indigo-400/20 rounded-full animate-pulse"></div>
            )}
          </button>
          
          <div className="flex-grow">
            <span className={`${todo.completed ? 'line-through text-gray-500' : 'text-white font-medium'} transition-all`}>
              {todo.text}
            </span>
            
            {todo.deadline && (
              <div className={`mt-1 text-xs flex items-center ${
                isDeadlinePast() ? 'text-red-400' : 
                isDeadlineApproaching() ? 'text-yellow-400' : 
                'text-gray-400'
              }`}>
                {isDeadlinePast() ? <Clock size={12} className="mr-1" /> : <Calendar size={12} className="mr-1" />}
                {formatDeadline(todo.deadline)}
                {isDeadlinePast() && !todo.completed && <span className="ml-1 font-semibold animate-pulse">(overdue)</span>}
              </div>
            )}
            
            {todo.completed && todo.completedAt && (
              <div className="mt-1 text-xs flex items-center text-green-400">
                <CheckCircle size={12} className="mr-1" />
                Completed on {todo.completedAt.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>
          
          {todo.project && (
            <span className="px-2 py-1 text-xs rounded-full bg-indigo-500/20 text-indigo-300 flex items-center">
              <Tag size={12} className="mr-1" />
              {todo.project}
            </span>
          )}
          
          {renderPriorityIndicator()}
          
          <div className={`flex space-x-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-blue-500/10"
              title="Edit task"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDeleteTodo(todo.id)}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors rounded-full hover:bg-red-500/10"
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-grow p-2 bg-gray-700/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <button 
            onClick={handleSaveEdit}
            className="p-2 text-green-400 hover:text-green-300 transition-colors"
            title="Save changes"
          >
            <Save size={16} />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            title="Cancel editing"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </li>
  );
};

export default TodoItem;