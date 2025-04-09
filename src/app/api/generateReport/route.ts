import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

// Ensure Firebase is initialized
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("🔥 Firebase Initialization Error:", error);
    throw error;
  }
}

const db = admin.firestore();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Type Definitions
interface Task {
  text: string;
  completed: boolean;
  deadline: admin.firestore.Timestamp;
  userId: string;
}

interface User {
  email: string;
}

interface CustomError extends Error {
  message: string;
}

// ** Main Function - Send Weekly Reports **
const sendWeeklyReports = async () => {
  try {
    console.log("📣 Fetching last week's reports from Firestore...");

    const now = new Date();
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);
    lastWeekStart.setHours(0, 0, 0, 0);

    const lastWeekEnd = new Date(now);
    lastWeekEnd.setHours(23, 59, 59, 999);

    const lastWeekStartTimestamp = admin.firestore.Timestamp.fromDate(lastWeekStart);
    const lastWeekEndTimestamp = admin.firestore.Timestamp.fromDate(lastWeekEnd);

    // Query "todos" table for last week's completed tasks
    const todosSnapshot = await db
      .collection("todos")
      .where("deadline", ">=", lastWeekStartTimestamp)
      .where("deadline", "<=", lastWeekEndTimestamp)
      .get();

    if (todosSnapshot.empty) {
      console.log("❌ No tasks found for last week.");
      return { success: false, message: "No data available for last week" };
    }

    console.log(`📊 Found ${todosSnapshot.size} tasks.`);

    const userTasksMap = new Map<string, Task[]>();

    // Group tasks by userId
    todosSnapshot.forEach((doc) => {
      const task = doc.data() as Task;
      if (!userTasksMap.has(task.userId)) {
        userTasksMap.set(task.userId, []);
      }
      userTasksMap.get(task.userId)?.push(task);
    });

    console.log(`📊 Found ${userTasksMap.size} unique users.`);

    const emailPromises: Promise<void>[] = [];

    for (const [userId, tasks] of userTasksMap.entries()) {
      const userSnapshot = await db.collection("users").where("uid", "==", userId).get();

      if (userSnapshot.empty) {
        console.warn(`⚠️ No email found for userId: ${userId}. Skipping.`);
        continue;
      }

      const userEmail = userSnapshot.docs[0].data().email;
      console.log(`📧 Sending report to: ${userEmail}`);

      const completedTasks = tasks.filter(task => task.completed).length;
      const totalTasks = tasks.length;

      const performanceMessage = completedTasks === totalTasks
        ? "Excellent job! You completed all your tasks! 🎉"
        : `You completed ${completedTasks} out of ${totalTasks} tasks. Keep pushing forward! 💪`;

      const taskListHTML = tasks
        .map((task) => `<li>${task.text} - ${task.completed ? "✅ Completed" : "❌ Not Completed"} (Deadline: ${task.deadline.toDate().toLocaleDateString()})</li>`)
        .join("");

      const mailOptions = {
        from: `"Performance Report" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: "📊 Your Weekly Performance Report",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #4a86e8;">📊 Weekly Performance Summary</h2>
            <p>Hi ${userEmail},</p>
            <p>Here's your performance summary for the last week:</p>
            <ul>${taskListHTML}</ul>
            <p><strong>${performanceMessage}</strong></p>
            <p>Keep up the good work!</p>
          </div>
        `,
        text: `Your Weekly Report:\n\n${tasks.map((task) => `- ${task.text}: ${task.completed ? "Completed" : "Not Completed"} (Deadline: ${task.deadline.toDate().toLocaleDateString()})`).join("\n")}`,
      };

      emailPromises.push(
        transporter.sendMail(mailOptions).then(() => {
          console.log(`✅ Report sent to ${userEmail}`);
        }).catch((error) => {
          console.error(`❌ Email failed for ${userEmail}:`, error);
        })
      );
    }

    await Promise.allSettled(emailPromises);

    return { success: true, message: "Weekly reports sent successfully!" };
  } catch (error: unknown) {
    const err = error as CustomError;
    console.error("🔥 Error in sendWeeklyReports:", err.message);
    return { error: "Failed to generate reports: " + err.message };
  }
};

// ** API Handler - Triggers Report Generation **
export async function GET(req: NextRequest) {
  try {
    console.log("📣 API called for weekly report generation.");
    const response = await sendWeeklyReports();
    return NextResponse.json(response);
  } catch (error: unknown) {
    const err = error as CustomError;
    console.error("🔥 API Error:", err.message);
    return NextResponse.json(
      { error: "Failed to process weekly reports", details: err.message },
      { status: 500 }
    );
  }
}