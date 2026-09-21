/**
 * Centralized Thresholds and Constants for Modern Learners Analytics Engine
 */

export const ANALYTICS_THRESHOLDS = {
  // Academic Performance
  DEFAULT_PASSING_PERCENTAGE: 80.0,
  OUTSTANDING_PERCENTAGE_THRESHOLD: 95.0,
  EXCELLENT_PERCENTAGE_THRESHOLD: 90.0,

  // Weak Areas & Improvement
  WEAK_TOPIC_ACCURACY_THRESHOLD: 80.0, // Accuracy < 80% is flagged as needing improvement
  CRITICAL_WEAK_TOPIC_THRESHOLD: 50.0, // Accuracy < 50% is severe

  // Needs Attention Rule Triggers
  REPEATED_FAILURES_THRESHOLD: 2, // 2 or more consecutive failed exams
  DECLINING_TREND_THRESHOLD: 3, // 3 consecutive score drops
  LOW_SUBJECT_AVERAGE_THRESHOLD: 60.0, // Subject average < 60%
  LOW_OVERALL_AVERAGE_THRESHOLD: 65.0, // Overall average < 65%
  LOW_ATTENDANCE_THRESHOLD: 75.0, // Attendance rate < 75%
  MISSED_ASSIGNMENTS_THRESHOLD: 2, // 2 or more active exams missed/expired without attempt
  SIGNIFICANT_DROP_PERCENTAGE: 20.0, // Drop of 20% or more from student's historical baseline

  // Sample Size Controls
  MINIMUM_EXAMS_FOR_TREND: 2, // Distinguish 0, 1, and 2+ exams for trend calculation
} as const;

export type TrendDirection = "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA";

export type AttentionSeverity = "HIGH" | "MEDIUM";
