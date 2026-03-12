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
    Forbidden,

    [ApiErrorInfo(409, "Un utilisateur avec cet email existe déjà")]
    EmailAlreadyExists,

    [ApiErrorInfo(403, "Vous avez atteint la limite de {0} utilisateurs de votre abonnement")]
    UserLimitReached,

    [ApiErrorInfo(400, "Vous ne pouvez pas désactiver votre propre compte")]
    CannotDeactivateSelf,

    [ApiErrorInfo(400, "Rôle invalide")]
    InvalidRole,

    [ApiErrorInfo(400, "Vous ne pouvez pas modifier votre propre rôle")]
    CannotChangeOwnRole
}
