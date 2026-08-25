CREATE INDEX "Course_status_price_publishedAt_idx" ON "Course"("status", "price", "publishedAt");
CREATE INDEX "CourseView_courseId_lastViewedAt_idx" ON "CourseView"("courseId", "lastViewedAt");
