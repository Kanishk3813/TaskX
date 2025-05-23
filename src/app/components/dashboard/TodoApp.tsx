"use client";
import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";

import { Todo, ViewType } from "../../Types/types";
import Sidebar from "./Sidebar";
import TodoHeader from "./TodoHeader";
import TodoInput from "./TodoInput";
import TodoList from "./TodoList";
import EmptyState from "./EmptyState";
import LoginPage from "./Login";
import ProfilePage from "./profile"; // Import the ProfilePage component
import StatsPage from "./statspage";

const firebaseConfig = {
  apiKey: "AIzaSyB_1C1kD02UmLi4wgf02bkigve2Xtg5kn0",
  authDomain: "taskx-f8b52.firebaseapp.com",
  projectId: "taskx-f8b52",
  storageBucket: "taskx-f8b52.firebasestorage.app",
  messagingSenderId: "787997712321",
  appId: "1:787997712321:web:d4aef7955262fc19b3d940",
  measurementId: "G-3WHTR3E4VQ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [activeView, setActiveView] = useState<ViewType>("inbox");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [onLoginPage, setOnLoginPage] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [showTaskInput, setShowTaskInput] = useState<boolean>(false);
  const [showProfilePage, setShowProfilePage] = useState<boolean>(false);
  const [showStatsPage, setShowStatsPage] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setOnLoginPage(!currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeView === "project-personal") {
      setActiveProject("Personal");
    } else if (activeView === "project-work") {
      setActiveProject("Work");
    } else {
      setActiveProject(null);
    }
  }, [activeView]);

  useEffect(() => {
    if (!user) return;
  
    const q = query(
      collection(firestore, "todos"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTodos: Todo[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || "",
          completed: !!data.completed,
          createdAt:
            data.createdAt instanceof Date
              ? data.createdAt
              : new Date(data.createdAt?.seconds * 1000 || Date.now()),
          priority: data.priority || 4,
          userId: data.userId || user.uid,
          project: data.project || undefined,
          deadline: data.deadline
            ? new Date(data.deadline.seconds * 1000)
            : undefined,
          recurring: data.recurring || undefined,
          completedAt: data.completedAt 
            ? new Date(data.completedAt.seconds * 1000) 
            : undefined,
          calendarEventId: data.calendarEventId || undefined,
        } as Todo;
      });
  
      setTodos(fetchedTodos);
    });
  
    return () => unsubscribe();
  }, [user]);

  const handleNavigateToStats = () => {
    setShowStatsPage(true);
  };

  const handleBackFromStats = () => {
    setShowStatsPage(false);
  };

const syncWithGoogleCalendar = async (todo: Todo): Promise<void> => {
  if (!user || !todo.deadline) return;
  
  try {
    const userDocRef = doc(firestore, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists() || !userDoc.data().googleTokens) {
      console.log('Google Calendar not connected. Skipping sync.');
      return;
    }
    
    const idToken = await user.getIdToken();
    
    const response = await fetch('/api/sync-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        todoId: todo.id,
        text: todo.text,
        deadline: todo.deadline.toISOString(),
        calendarEventId: todo.calendarEventId
      })
    });
    
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const errorData = await response.json();
        
        if (errorData.needsIntegration) {
          console.log('Google Calendar integration needed');
          return;
        }
        
        throw new Error(errorData.error || 'Failed to sync with Google Calendar');
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      
      if (data.eventId && !todo.calendarEventId) {
        console.log("Successfully created calendar event:", data.eventId);
        await updateDoc(doc(firestore, "todos", todo.id), {
          calendarEventId: data.eventId
        });
      }
    } else {
      console.error('Received non-JSON response from API');
      const textResponse = await response.text();
      console.error('Response content:', textResponse.substring(0, 100) + '...');
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Calendar sync error:', error);
  }
};

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(firestore, "todos"),
      where("userId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if ((change.type === 'added' || change.type === 'modified') && change.doc.data().deadline) {
          const todoData = change.doc.data();
          const todo = {
            ...todoData,
            id: change.doc.id,
            deadline: todoData.deadline ? new Date(todoData.deadline.seconds * 1000) : undefined
          } as Todo;
          
          await syncWithGoogleCalendar(todo);
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTodo = async (
    taskTitle: string,
    deadline?: string,
    recurring?: string,
    project?: string,
    priority: number = 4
  ): Promise<void> => {
    if (taskTitle.trim() === "" || !user) return;
  
    let todoProject = project;
    if (!todoProject && activeProject) {
      todoProject = activeProject;
    }
  
    const newTodo: any = {
      text: taskTitle.trim(),
      completed: false,
      createdAt: new Date(),
      priority: priority,
      userId: user.uid,
    };
  
    if (todoProject) {
      newTodo.project = todoProject;
    }
  
    if (deadline) {
      newTodo.deadline = new Date(deadline);
    }
  
    if (recurring) {
      newTodo.recurring = recurring;
    }
  
    try {
      // Add the todo to Firestore
      const docRef = await addDoc(collection(firestore, "todos"), newTodo);
      setInputValue("");
      
      // Sync with Google Calendar if there's a deadline
      if (deadline) {
        // Create a todo object with the new ID for syncing
        const todoForSync: Todo = {
          id: docRef.id,
          text: newTodo.text,
          completed: newTodo.completed,
          createdAt: newTodo.createdAt,
          priority: newTodo.priority,
          userId: newTodo.userId,
          project: newTodo.project,
          deadline: newTodo.deadline,
          recurring: newTodo.recurring
        };
        
        // Sync with Google Calendar
        await syncWithGoogleCalendar(todoForSync);
      }
    } catch (error) {
      console.error("Error adding todo: ", error);
    }
  };

  const handleUpdatePriority = async (
    id: string,
    priority: number
  ): Promise<void> => {
    if (!user) return;

    const todoRef = doc(firestore, "todos", id);
    try {
      await updateDoc(todoRef, { priority });
    } catch (error) {
      console.error("Error updating todo priority: ", error);
    }
  };

  const handleUpdateProject = async (
    id: string,
    project: string
  ): Promise<void> => {
    if (!user) return;

    const todoRef = doc(firestore, "todos", id);
    try {
      await updateDoc(todoRef, { project });
    } catch (error) {
      console.error("Error updating todo project: ", error);
    }
  };

  const handleToggleTodo = async (id: string): Promise<void> => {
    if (!user) return;
  
    const todoRef = doc(firestore, "todos", id);
    const todoToUpdate = todos.find((todo) => todo.id === id);
  
    if (todoToUpdate) {
      try {
        const newCompletedStatus = !todoToUpdate.completed;
        
        const updateData: any = {
          completed: newCompletedStatus,
        };
        
        if (newCompletedStatus) {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
        
        await updateDoc(todoRef, updateData);
      } catch (error) {
        console.error("Error toggling todo: ", error);
      }
    }
  };

  const handleDeleteTodo = async (id: string): Promise<void> => {
    if (!user) return;
  
    try {
      // First, delete from Google Calendar if there's an associated event
      const todoToDelete = todos.find(todo => todo.id === id);
      if (todoToDelete?.calendarEventId) {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('/api/delete-calendar-event', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              eventId: todoToDelete.calendarEventId
            })
          });
          
          // Check if the response is JSON before trying to parse it
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (!response.ok) {
              console.error('Error deleting calendar event:', data.error);
            }
          } else {
            // Handle non-JSON responses
            console.error('Received non-JSON response from API');
            const textResponse = await response.text();
            console.error('Response content:', textResponse.substring(0, 100) + '...');
          }
        } catch (error) {
          console.error('Error deleting calendar event:', error);
          // Continue with todo deletion even if calendar event deletion fails
        }
      }
      
      // Then delete the todo
      await deleteDoc(doc(firestore, "todos", id));
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  const handleNavigateToProfile = () => {
    setShowProfilePage(true);
  };

  const handleBackFromProfile = () => {
    setShowProfilePage(false);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isUpcoming = (todo: Todo): boolean => {
    if (!todo.deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return todo.deadline >= today && !isToday(todo.deadline);
  };

  const filteredTodos = todos.filter((todo) => {
    if (activeView === "today")
      return (
        isToday(todo.createdAt) ||
        (todo.deadline ? isToday(todo.deadline) : false)
      );
    if (activeView === "important") return todo.priority <= 2;
    if (activeView === "completed") return todo.completed;
    if (activeView === "upcoming") return isUpcoming(todo);

    if (activeView === "project-personal") return todo.project === "Personal";
    if (activeView === "project-work") return todo.project === "Work";
    if (activeView === "project-study") return todo.project === "Study";
    if (activeView === "project-health") return todo.project === "Health";

    return true;
  });

  const handleEditTodo = async (id: string, newText: string): Promise<void> => {
    if (!user) return;

    const todoRef = doc(firestore, "todos", id);
    try {
      await updateDoc(todoRef, { text: newText });
    } catch (error) {
      console.error("Error updating todo: ", error);
    }
  };

  if (!user || onLoginPage) {
    return <LoginPage />;
  }

  if (showProfilePage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <TodoHeader
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          user={user}
          onLoginPage={onLoginPage}
          setOnLoginPage={setOnLoginPage}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToStats={handleNavigateToStats}
        />
        <ProfilePage onBack={handleBackFromProfile} />
      </div>
    );
  }

  if (showStatsPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <TodoHeader
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          user={user}
          onLoginPage={onLoginPage}
          setOnLoginPage={setOnLoginPage}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToStats={handleNavigateToStats}
        />
        <StatsPage onBack={handleBackFromStats} user={user} />
      </div>
    );
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
        onNavigateToProfile={handleNavigateToProfile}
        onNavigateToStats={handleNavigateToStats}
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
                {activeView === "inbox"
                  ? "Inbox"
                  : activeView === "today"
                  ? "Today"
                  : activeView === "important"
                  ? "Important"
                  : activeView === "upcoming"
                  ? "Upcoming"
                  : activeView === "completed"
                  ? "Completed"
                  : activeView === "project-personal"
                  ? "Personal"
                  : activeView === "project-work"
                  ? "Work"
                  : activeView === "project-study"
                  ? "Study"
                  : activeView === "project-health"
                  ? "Health"
                  : "All Tasks"}
              </h2>
              <div className="text-sm text-gray-400">
                {filteredTodos.length} Tasks
              </div>
            </div>

            <TodoInput
              showTaskInput={showTaskInput}
              setShowTaskInput={setShowTaskInput}
              handleAddTodo={handleAddTodo}
              activeView={activeView}
              activeProject={activeProject}
            />

            {filteredTodos.length > 0 ? (
              <TodoList
                todos={filteredTodos}
                handleToggleTodo={handleToggleTodo}
                handleDeleteTodo={handleDeleteTodo}
                handleUpdatePriority={handleUpdatePriority}
                handleUpdateProject={handleUpdateProject}
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