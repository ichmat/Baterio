using System.Security.Claims;
using BackEnd.Shared.Interfaces;
using Serilog.Context;

namespace BackEnd.API.Infrastructure;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly HashSet<string> PublicPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/auth/login",
        "/api/auth/refresh",
        "/api/health"
    };

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        if (PublicPaths.Contains(path))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated == true)
        {
            var tenantClaim = context.User.FindFirst("tenant_id")?.Value;
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (int.TryParse(tenantClaim, out var tenantId))
            {
                tenantContext.TenantId = tenantId;
            }

            using (LogContext.PushProperty("TenantId", tenantClaim))
            using (LogContext.PushProperty("UserId", userIdClaim))
            {
                await _next(context);
                return;
            }
        }

        await _next(context);
    }
}
