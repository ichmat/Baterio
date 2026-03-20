export interface CommentResponse {
  id: number
  entityType: string
  entityId: number
  userId: number
  userFullName: string
  content: string
  createdAt: string
}

export interface CreateCommentRequest {
  content: string
}

export interface CommentsPage {
  data: CommentResponse[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}
