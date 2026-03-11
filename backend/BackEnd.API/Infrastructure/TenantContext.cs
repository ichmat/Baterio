using BackEnd.Shared.Interfaces;

namespace BackEnd.API.Infrastructure;

public class TenantContext : ITenantContext
{
    public int TenantId { get; set; }
}
