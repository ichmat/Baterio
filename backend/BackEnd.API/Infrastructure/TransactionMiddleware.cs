using BackEnd.API.Data;

namespace BackEnd.API.Infrastructure;

public class TransactionMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "PATCH", "DELETE"
    };

    public TransactionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        // 17.2 — Only wrap mutating requests; GET/HEAD/OPTIONS pass through without transaction
        if (!MutatingMethods.Contains(context.Request.Method))
        {
            await _next(context);
            return;
        }

        // 17.3 — Open transaction before pipeline
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            await _next(context);

            // 17.4 — Rollback on error responses (ApiExceptionFilter sets StatusCode >= 400)
            if (context.Response.StatusCode >= 400)
            {
                await transaction.RollbackAsync();
            }
            else
            {
                await transaction.CommitAsync();
            }
        }
        catch
        {
            // 17.5 — Rollback on unhandled exceptions via implicit dispose (await using),
            // then rethrow. No explicit RollbackAsync() to avoid masking the original exception
            // if the DB connection is lost.
            throw;
        }
    }
}
