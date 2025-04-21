import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, CheckCircle, XCircle, AlertTriangle, Award, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { Todo } from '../../Types/types';

interface StatsPageProps {
  onBack: () => void;
  user: any;
}

const StatsPage: React.FC<StatsPageProps> = ({ onBack, user }) => {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    avgCompletionTime: 0,
    mostProductiveDay: '',
    tasksByProject: {} as Record<string, number>,
    tasksByPriority: {} as Record<string, number>,
    streakDays: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      setLoading(true);
      const db = getFirestore();
      const now = new Date();
      
      const getStartDate = () => {
        const date = new Date();
        switch (selectedTimeframe) {
          case 'week':
            date.setDate(date.getDate() - 7);
            break;
          case 'month':
            date.setMonth(date.getMonth() - 1);
            break;
          case 'year':
            date.setFullYear(date.getFullYear() - 1);
            break;
        }
        return date;
      };
      
      const startDate = getStartDate();
      
      try {
        const q = query(
          collection(db, "todos"),
          where("userId", "==", user.uid),
          where("createdAt", ">=", startDate)
        );
        
        const querySnapshot = await getDocs(q);
        const todos: Todo[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          todos.push({
            id: doc.id,
            text: data.text || "",
            completed: !!data.completed,
            createdAt: data.createdAt instanceof Date
              ? data.createdAt
              : new Date(data.createdAt?.seconds * 1000 || Date.now()),
            priority: data.priority || 4,
            userId: data.userId,
            project: data.project,
            deadline: data.deadline
              ? new Date(data.deadline.seconds * 1000)
              : undefined,
            completedAt: data.completedAt
              ? new Date(data.completedAt.seconds * 1000)
              : undefined,
          } as Todo);
        });
        
        const completedTasks = todos.filter(todo => todo.completed);
        const overdueTasks = todos.filter(todo => 
          !todo.completed && 
          todo.deadline && 
          todo.deadline < now
        );
        
        const completionRate = todos.length > 0 
          ? Math.round((completedTasks.length / todos.length) * 100) 
          : 0;
        
        let totalCompletionTime = 0;
        let tasksWithCompletionTime = 0;
        
        completedTasks.forEach(task => {
          if (task.completedAt && task.createdAt) {
            const completionTime = task.completedAt.getTime() - task.createdAt.getTime();
            totalCompletionTime += completionTime;
            tasksWithCompletionTime++;
          }
        });
        
        const avgCompletionTime = tasksWithCompletionTime > 0
          ? Math.round(totalCompletionTime / tasksWithCompletionTime / (1000 * 60 * 60)) // in hours
          : 0;
        
        const completionsByDay: Record<string, number> = {};
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        completedTasks.forEach(task => {
          if (task.completedAt) {
            const day = daysOfWeek[task.completedAt.getDay()];
            completionsByDay[day] = (completionsByDay[day] || 0) + 1;
          }
        });
        
        let mostProductiveDay = '';
        let maxCompletions = 0;
        
        Object.entries(completionsByDay).forEach(([day, count]) => {
          if (count > maxCompletions) {
            mostProductiveDay = day;
            maxCompletions = count;
          }
        });
        
        const tasksByProject: Record<string, number> = {};
        
        todos.forEach(task => {
          const project = task.project || 'No Project';
          tasksByProject[project] = (tasksByProject[project] || 0) + 1;
        });
        
        const tasksByPriority: Record<string, number> = {
          '1 - Urgent': 0,
          '2 - High': 0,
          '3 - Medium': 0,
          '4 - Low': 0
        };
        
        todos.forEach(task => {
          switch (task.priority) {
            case 1:
              tasksByPriority['1 - Urgent']++;
              break;
            case 2:
              tasksByPriority['2 - High']++;
              break;
            case 3:
              tasksByPriority['3 - Medium']++;
              break;
            case 4:
              tasksByPriority['4 - Low']++;
              break;
          }
        });

        const dateMap = new Map<string, boolean>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          dateMap.set(date.toISOString().split('T')[0], false);
        }
        
        completedTasks.forEach(task => {
          if (task.completedAt) {
            const dateKey = task.completedAt.toISOString().split('T')[0];
            dateMap.set(dateKey, true);
          }
        });
        
        let streakDays = 0;
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const dateKey = date.toISOString().split('T')[0];
          
          if (dateMap.get(dateKey)) {
            streakDays++;
          } else if (i === 0) {
            continue;
          } else {
            break;
          }
        }
        
        setStats({
          totalTasks: todos.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          completionRate,
          avgCompletionTime,
          mostProductiveDay: mostProductiveDay || 'N/A',
          tasksByProject,
          tasksByPriority,
          streakDays
        });
        
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [user, selectedTimeframe]);
  
  const getProductivityTips = () => {
    const tips: string[] = [];
    
    if (stats.completionRate < 50) {
      tips.push("Try breaking down larger tasks into smaller, more manageable subtasks.");
      tips.push("Consider using the Pomodoro technique - work for 25 minutes, then take a 5-minute break.");
    }
    
    if (stats.overdueTasks > 3) {
      tips.push("You have several overdue tasks. Try to set more realistic deadlines.");
      tips.push("Consider scheduling specific time blocks for completing tasks.");
    }
    
    if (stats.avgCompletionTime > 24) {
      tips.push("Tasks are taking more than a day to complete on average. Try to estimate task difficulty more accurately.");
    }
    
    const highPriorityCount = stats.tasksByPriority['1 - Urgent'] + stats.tasksByPriority['2 - High'];
    const totalPriorityCount = Object.values(stats.tasksByPriority).reduce((sum, count) => sum + count, 0);
    
    if (highPriorityCount / totalPriorityCount > 0.5 && totalPriorityCount > 0) {
      tips.push("You have many high-priority tasks. Consider re-evaluating priorities to avoid burnout.");
    }
    
    if (tips.length < 3) {
      tips.push("Try working on your most important task first thing in the morning.");
      tips.push("Take short breaks between tasks to maintain focus and energy.");
      tips.push("Consider using the 2-minute rule: if a task takes less than 2 minutes, do it immediately.");
    }
    
    return tips.slice(0, 3);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 relative z-10">
      <div className="mb-6 flex items-center">
        <button
          onClick={onBack}
          className="mr-3 p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
          Productivity Stats
        </h2>
      </div>
      
      {/* Timeframe selector */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-md overflow-hidden border border-white/20 bg-black/30">
          <button
            onClick={() => setSelectedTimeframe('week')}
            className={`px-4 py-2 text-sm ${selectedTimeframe === 'week' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-transparent text-white/70 hover:bg-white/10'}`}
          >
            Last Week
          </button>
          <button
            onClick={() => setSelectedTimeframe('month')}
            className={`px-4 py-2 text-sm ${selectedTimeframe === 'month' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-transparent text-white/70 hover:bg-white/10'}`}
          >
            Last Month
          </button>
          <button
            onClick={() => setSelectedTimeframe('year')}
            className={`px-4 py-2 text-sm ${selectedTimeframe === 'year' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-transparent text-white/70 hover:bg-white/10'}`}
          >
            Last Year
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/90 font-medium">Completion Rate</h3>
                <CheckCircle size={20} className="text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.completionRate}%</p>
              <p className="text-white/60 text-sm mt-1">
                {stats.completedTasks} of {stats.totalTasks} tasks completed
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/90 font-medium">Avg. Completion Time</h3>
                <Clock size={20} className="text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {stats.avgCompletionTime > 0 ? `${stats.avgCompletionTime}h` : 'N/A'}
              </p>
              <p className="text-white/60 text-sm mt-1">From creation to completion</p>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/90 font-medium">Overdue Tasks</h3>
                <XCircle size={20} className="text-red-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.overdueTasks}</p>
              <p className="text-white/60 text-sm mt-1">Tasks past their deadline</p>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/90 font-medium">Current Streak</h3>
                <Award size={20} className="text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.streakDays} days</p>
              <p className="text-white/60 text-sm mt-1">Days with completed tasks</p>
            </div>
          </div>
          
          {/* Detailed stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Most productive day */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center mb-4">
                <Calendar className="text-indigo-400 mr-3" size={24} />
                <h3 className="text-xl font-semibold text-white">Most Productive Day</h3>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.mostProductiveDay}
              </p>
              <p className="text-white/60 mt-2">
                You tend to complete more tasks on this day of the week.
              </p>
            </div>
            
            {/* Projects breakdown */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center mb-4">
                <TrendingUp className="text-indigo-400 mr-3" size={24} />
                <h3 className="text-xl font-semibold text-white">Tasks by Project</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(stats.tasksByProject).length > 0 ? (
                  Object.entries(stats.tasksByProject)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([project, count]) => (
                      <div key={project} className="flex items-center justify-between">
                        <span className="text-white/80">{project}</span>
                        <span className="text-indigo-400 font-medium">{count} tasks</span>
                      </div>
                    ))
                ) : (
                  <p className="text-white/60">No project data available</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Productivity tips */}
          <div className="bg-gradient-to-br from-indigo-800/30 to-purple-800/30 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <AlertTriangle className="text-yellow-400 mr-3" size={24} />
              <h3 className="text-xl font-semibold text-white">Productivity Tips</h3>
            </div>
            <div className="space-y-4">
              {getProductivityTips().map((tip, index) => (
                <div key={index} className="flex">
                  <ArrowRight size={18} className="text-indigo-400 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-white/80">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsPage;