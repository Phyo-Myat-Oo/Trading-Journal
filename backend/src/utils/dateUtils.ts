/**
 * Date Utility Functions
 * 
 * This module provides date manipulation and formatting utilities used throughout the application
 * for consistent date handling and calculations.
 */
import { AnalysisPeriod } from '../models/Analysis';

/**
 * Get a date range object for a given analysis period
 * 
 * This function calculates appropriate start and end dates based on the
 * specified analysis period (daily, weekly, monthly, etc.). It sets the
 * time components appropriately to cover the full period.
 * 
 * @param period The analysis period (DAILY, WEEKLY, MONTHLY, etc.)
 * @returns An object with startDate and endDate
 */
export function getDateRangeForPeriod(period: AnalysisPeriod): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date();
  let startDate = new Date();
  
  switch (period) {
    case AnalysisPeriod.DAILY:
      // Today - from midnight to 23:59:59.999
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case AnalysisPeriod.WEEKLY:
      // Last 7 days - from 7 days ago at midnight to today at 23:59:59.999
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case AnalysisPeriod.MONTHLY:
      // Last 30 days - from 30 days ago at midnight to today at 23:59:59.999
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case AnalysisPeriod.QUARTERLY:
      // Last 90 days - from 90 days ago at midnight to today at 23:59:59.999
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case AnalysisPeriod.YEARLY:
      // Last 365 days - from 365 days ago at midnight to today at 23:59:59.999
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 365);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case AnalysisPeriod.CUSTOM:
      // Default to last 30 days for CUSTOM (should be overridden by caller)
      // This provides a sensible default for custom periods
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
  }
  
  return { startDate, endDate };
}

/**
 * Format a date as YYYY-MM-DD
 * 
 * Standardized date formatting function that ensures consistent
 * date string representations across the application.
 * 
 * @param date The date to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date as a human-readable string
 * 
 * Creates a localized, user-friendly date representation
 * (e.g., "Jan 1, 2023") for display in UI components.
 * 
 * @param date The date to format
 * @returns Formatted date string in localized format
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Calculate the number of days between two dates
 * 
 * Computes the absolute difference in days between two dates,
 * useful for calculating durations and date ranges.
 * 
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of days (always positive)
 */
export function getDaysDifference(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date range is valid (startDate is before or equal to endDate)
 * 
 * Used for validating user-provided date ranges to ensure
 * they represent a valid time period.
 * 
 * @param startDate Start date
 * @param endDate End date
 * @returns True if valid, false otherwise
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
} 