// 课程库接口
import { get, post } from './client';

export interface CourseItem {
  id: number;
  name: string;
  code: string;
  department: string | null;
  teacher: string | null;
  ratingScore: number | null;
  ratingCount: number;
  postCount: number;
  reviewCount: number;
}

export interface CourseReviewItem {
  id: number;
  rating: number;
  workload: number;
  attendance: number;
  recommend: number;
  content: string | null;
  isAnonymous: boolean;
  authorName: string;
  createdAt: string;
}

export interface CourseDetail extends CourseItem {
  workloadScore: number | null;
  attendanceScore: number | null;
  recommendScore: number | null;
  discussions: {
    id: number;
    title: string;
    excerpt: string | null;
    boardName: string;
    authorName: string;
    likeCount: number;
    commentCount: number;
    lastActivityAt: string;
  }[];
  reviews: CourseReviewItem[];
  myReview: { rating: number; workload: number; attendance: number; recommend: number; content: string | null } | null;
}

export function fetchCourses(q = ''): Promise<CourseItem[]> {
  return get<CourseItem[]>(`/courses?q=${encodeURIComponent(q)}`);
}

export function fetchCourse(code: string): Promise<CourseDetail> {
  return get<CourseDetail>(`/courses/${code}`);
}

export function submitCourseReview(
  courseId: number,
  payload: { rating: number; workload: number; attendance: number; recommend: number; content?: string; isAnonymous: boolean },
): Promise<{ ratingScore: number | null; ratingCount: number }> {
  return post(`/courses/${courseId}/review`, payload);
}
