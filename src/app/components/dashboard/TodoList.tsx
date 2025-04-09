import React, { useState } from 'react';
import { Todo } from '../../Types/types';
import TodoItem from './TodoItem';
import { Calendar, Clock, ArrowDown, ArrowUp, Filter } from 'lucide-react';

interface TodoListProps {
  todos: Todo[];
  handleToggleTodo: (id: string) => void | Promise<void>;
  handleDeleteTodo: (id: string) => void | Promise<void>;
  handleUpdatePriority: (id: string, priority: number) => void | Promise<void>;
  handleUpdateProject: (id: string, project: string) => void | Promise<void>;
  handleEditTodo?: (id: string, text: string) => void | Promise<void>;
}

const TodoList: React.FC<TodoListProps> = ({ 
  todos, 
  handleToggleTodo, 
  handleDeleteTodo,
  handleUpdatePriority,
  handleUpdateProject,
  handleEditTodo
}) => {
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);
  
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const sortedTodos = [...todos].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'priority') {
      comparison = a.priority - b.priority;
    } else if (sortBy === 'deadline') {
      if (!a.deadline && !b.deadline) comparison = 0;
      else if (!a.deadline) comparison = 1;
      else if (!b.deadline) comparison = -1;
      else comparison = a.deadline.getTime() - b.deadline.getTime();
    } else {
      comparison = a.createdAt.getTime() - b.createdAt.getTime();
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  const filteredTodos = sortedTodos.filter(todo => {
    if (filterCompleted === null) return true;
    return todo.completed === filterCompleted;
  });

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center justify-between">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
        >
          <Filter size={14} />
          <span>Filters & Sort</span>
        </button>
        
        <div className="text-sm text-gray-400">
          {filteredTodos.length} {filteredTodos.length === 1 ? 'task' : 'tasks'}
        </div>
      </div>
      
      {showFilters && (
        <div className="mb-4 p-3 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50">
          <div className="flex flex-wrap gap-4">
            <div>
              <h4 className="text-xs text-gray-400 mb-2">Sort by:</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSort('createdAt')}
                  className={`px-3 py-1 text-xs rounded-full flex items-center space-x-1 ${
                    sortBy === 'createdAt' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <span>Date</span>
                  {getSortIcon('createdAt')}
                </button>
                <button
                  onClick={() => handleSort('priority')}
                  className={`px-3 py-1 text-xs rounded-full flex items-center space-x-1 ${
                    sortBy === 'priority' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <span>Priority</span>
                  {getSortIcon('priority')}
                </button>
                <button
                  onClick={() => handleSort('deadline')}
                  className={`px-3 py-1 text-xs rounded-full flex items-center space-x-1 ${
                    sortBy === 'deadline' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <span>Deadline</span>
                  {getSortIcon('deadline')}
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="text-xs text-gray-400 mb-2">Filter completed:</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterCompleted(null)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterCompleted === null ? 'bg-indigo-500/30 text-indigo-300' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterCompleted(true)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterCompleted === true ? 'bg-green-500/30 text-green-300' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilterCompleted(false)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterCompleted === false ? 'bg-yellow-500/30 text-yellow-300' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  Active
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ul className="space-y-3">
        {filteredTodos.map(todo => (
          <TodoItem 
            key={todo.id}
            todo={todo}
            handleToggleTodo={handleToggleTodo}
            handleDeleteTodo={handleDeleteTodo}
            handleUpdatePriority={handleUpdatePriority}
            handleUpdateProject={handleUpdateProject}
            handleEditTodo={handleEditTodo}
          />
        ))}
      </ul>
      
      {filteredTodos.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
            <Calendar size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-1">No tasks found</h3>
          <p className="text-sm text-gray-500">Try changing your filters or add a new task</p>
        </div>
      )}
    </div>
  );
};

export default TodoList;