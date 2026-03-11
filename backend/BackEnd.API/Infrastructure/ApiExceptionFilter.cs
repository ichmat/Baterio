using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BackEnd.API.Infrastructure;

public class ApiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _logger;

    public ApiExceptionFilter(ILogger<ApiExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        if (context.Exception is ApiErrorException apiError)
        {
            var (status, message) = apiError.Code.GetInfo();

            context.Result = new JsonResult(new
            {
                type = "ApiError",
                code = apiError.Code.ToString(),
                status,
                message
            })
            {
                StatusCode = status
            };

            context.ExceptionHandled = true;
            return;
        }

        _logger.LogError(context.Exception, "Unhandled exception");

        context.Result = new JsonResult(new
        {
            type = "ServerError",
            code = "ServerError",
            status = 500,
            message = "Une erreur inattendue s'est produite"
        })
        {
            StatusCode = 500
        };

        context.ExceptionHandled = true;
    }
}
