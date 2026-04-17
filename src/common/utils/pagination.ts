export type PaginationQuery = {
  page?: number;
  limit?: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  skip: number;
};

export const getPagination = (query: PaginationQuery): PaginationMeta => {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};
