using BackEnd.Shared.Models.Company;

namespace BackEnd.Shared.Interfaces;

public interface ICompanyService
{
    Task<CompanyInfoResponse> GetCompanyInfoAsync();
    Task<CompanyInfoResponse> UpdateCompanyInfoAsync(UpdateCompanyInfoRequest request);
    Task<SubscriptionInfoResponse> GetSubscriptionInfoAsync();
}
