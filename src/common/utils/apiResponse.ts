export type SuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export type ErrorResponse = {
  success: false;
  message: string;
  errors?: unknown;
};

export const successResponse = <T>(message: string, data: T): SuccessResponse<T> => ({
  success: true,
  message,
  data
});

export const errorResponse = (message: string, errors?: unknown): ErrorResponse => ({
  success: false,
  message,
  errors
});
