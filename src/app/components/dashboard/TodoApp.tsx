"use client";
import React, { useState, useEffect } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

import { Todo, ViewType } from '../../Types/types';
import Sidebar from './Sidebar';
import TodoHeader from './TodoHeader';
import TodoInput from './TodoInput';
import TodoList from './TodoList';
import EmptyState from './EmptyState';
import LoginPage from './Login';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_1C1kD02UmLi4wgf02bkigve2Xtg5kn0",
  authDomain: "taskx-f8b52.firebaseapp.com",
  projectId: "taskx-f8b52",
  storageBucket: "taskx-f8b52.firebasestorage.app",
  messagingSenderId: "787997712321",
  appId: "1:787997712321:web:d4aef7955262fc19b3d940",
  measurementId: "G-3WHTR3E4VQ"
};



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [activeView, setActiveView] = useState<ViewType>('inbox');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [onLoginPage, setOnLoginPage] = useState(false);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setOnLoginPage(!currentUser);
  });

  return () => unsubscribe();
}, []);

useEffect(() => {
  if (!user) return;

  const q = query(collection(firestore, 'todos'), where('userId', '==', user.uid));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const fetchedTodos: Todo[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text || '',
        completed: !!data.completed,
        createdAt: data.createdAt instanceof Date 
          ? data.createdAt 
          : new Date(data.createdAt?.seconds * 1000 || Date.now()),
        priority: data.priority || 4,
        userId: data.userId || user.uid
      } as Todo;
    });

    setTodos(fetchedTodos);
  });

  return () => unsubscribe();
}, [user]);

  const handleAddTodo = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (inputValue.trim() === '' || !user) return;

    const newTodo: Omit<Todo, 'id'> = {
      text: inputValue.trim(),
      completed: false,
      createdAt: new Date(),
      priority: 4,
      userId: user.uid
    };

    try {
      await addDoc(collection(firestore, 'todos'), newTodo);
      setInputValue('');
    } catch (error) {
      console.error("Error adding todo: ", error);
    }
  };

  const handleToggleTodo = async (id: string): Promise<void> => {
    if (!user) return;

    const todoRef = doc(firestore, 'todos', id);
    const todoToUpdate = todos.find(todo => todo.id === id);

    if (todoToUpdate) {
      try {
        await updateDoc(todoRef, {
          completed: !todoToUpdate.completed
        });
      } catch (error) {
        console.error("Error toggling todo: ", error);
      }
    }
  };

  const handleDeleteTodo = async (id: string): Promise<void> => {
    if (!user) return;

    try {
      await deleteDoc(doc(firestore, 'todos', id));
    } catch (error) {
      console.error("Error deleting todo: ", error);
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const filteredTodos = todos.filter(todo => {
    if (activeView === 'today') return isToday(todo.createdAt);
    if (activeView === 'important') return todo.priority <= 2;
    if (activeView === 'completed') return todo.completed;
    return true;
  });

  if (!user || onLoginPage) {
    return <LoginPage />;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white overflow-hidden">
      <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>

      <TodoHeader 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        user={user}
        onLoginPage={onLoginPage}
        setOnLoginPage={setOnLoginPage}
      />

      <div className="relative z-10 flex">
        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <div className="flex-grow p-4 md:p-8 overflow-auto relative">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
                {activeView === 'inbox' ? 'Inbox' : 
                activeView === 'today' ? 'Today' : 
                activeView === 'important' ? 'Important' : 'Completed'}
              </h2>
              <div className="text-sm text-gray-400">
                {filteredTodos.length} Tasks
              </div>
            </div>

            <TodoInput 
              inputValue={inputValue}
              setInputValue={setInputValue}
              handleAddTodo={handleAddTodo}
            />

            {filteredTodos.length > 0 ? (
              <TodoList 
                todos={filteredTodos}
                handleToggleTodo={handleToggleTodo}
                handleDeleteTodo={handleDeleteTodo}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoApp;