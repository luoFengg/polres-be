/**
 * Helper function untuk pagination dengan Prisma
 * @param {Object} prismaModel - Prisma model (e.g., prisma.anggota)
 * @param {Object} options - Options untuk pagination
 * @param {number} options.page - Current page (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {Object} options.where - Prisma where clause
 * @param {Object} options.select - Prisma select clause
 * @param {Array} options.orderBy - Prisma orderBy clause
 * @param {Array} options.include - Prisma include clause
 * @returns {Object} Paginated result with data and pagination info
 */
const paginate = async (prismaModel, options = {}) => {
  const {
    page = 1,
    limit = 20,
    where = {},
    select,
    orderBy,
    include,
  } = options;

  const currentPage = parseInt(page);
  const itemsPerPage = parseInt(limit);
  const skip = (currentPage - 1) * itemsPerPage;

  // Build query options
  const queryOptions = {
    where,
    skip,
    take: itemsPerPage,
  };

  if (select) queryOptions.select = select;
  if (include) queryOptions.include = include;
  if (orderBy) queryOptions.orderBy = orderBy;

  // Execute queries in parallel
  const [data, totalCount] = await Promise.all([
    prismaModel.findMany(queryOptions),
    prismaModel.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return {
    data,
    pagination: {
      currentPage,
      totalPages,
      totalItems: totalCount,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      skip,
      take: itemsPerPage,
    },
  };
};

module.exports = { paginate };
