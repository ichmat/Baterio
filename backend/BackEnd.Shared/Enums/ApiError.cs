namespace BackEnd.Shared.Enums;

public enum ApiError
{
    [ApiErrorInfo(401, "Email ou mot de passe incorrect")]
    InvalidCredentials,

    [ApiErrorInfo(404, "Utilisateur non trouvé")]
    UserNotFound,

    [ApiErrorInfo(403, "Votre compte a été désactivé")]
    UserInactive,

    [ApiErrorInfo(401, "Token de rafraîchissement invalide")]
    InvalidRefreshToken,

    [ApiErrorInfo(401, "Token de rafraîchissement expiré")]
    ExpiredRefreshToken,

    [ApiErrorInfo(401, "Non autorisé")]
    Unauthorized,

    [ApiErrorInfo(403, "Accès interdit")]
    Forbidden
}
