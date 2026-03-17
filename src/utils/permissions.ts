import { User } from "../db/db";

export function canViewActivity(activityUserId: number | undefined, currentUser: User | null, users: User[]): boolean {
  if (!currentUser) return false;
  
  // Super Admin sees everything
  if (currentUser.role === "Super Admin") return true;
  
  // Everyone sees their own activities
  if (activityUserId === currentUser.id) return true;
  
  // Cashier ONLY sees their own activities
  if (currentUser.role === "Cashier") return false;
  
  // For Admin and Manager, we need to know the role of the user who created the activity
  const activityUser = users.find(u => u.id === activityUserId);
  
  // If the user who created the activity is deleted or not found, let Admin/Manager see it
  if (!activityUser) return true;
  
  if (currentUser.role === "Admin") {
    // Admin sees everything except Super Admin activities
    return activityUser.role !== "Super Admin";
  }
  
  if (currentUser.role === "Manager") {
    // Manager sees Cashier and Manager activities, but not Admin or Super Admin
    return activityUser.role !== "Super Admin" && activityUser.role !== "Admin";
  }
  
  return false;
}
