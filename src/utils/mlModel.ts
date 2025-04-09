export function analyzePerformance(userData: any[]) {
    // 🔍 Step 1: Preprocess data
    const values = userData.map(data => data.value); // Extract performance values
    
    // 🔥 Step 2: Run data through your ML model (replace this with actual model logic)
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
  
    // 📊 Step 3: Generate insights
    let insights = `🔹 Average Score: ${average.toFixed(2)}\n`;
    insights += `🔹 Best Performance: ${max}\n`;
    insights += `🔹 Needs Improvement: ${min}\n`;
  
    if (average < 50) {
      insights += "\n⚠️ You may need extra practice this week.";
    } else if (average > 80) {
      insights += "\n🎉 Great job! Keep up the good work.";
    }
  
    return insights;
  }
  