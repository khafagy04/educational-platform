import { CourseBuilder } from '@/components/course-builder';
export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  return <CourseBuilder courseId={(await params).id} />;
}
