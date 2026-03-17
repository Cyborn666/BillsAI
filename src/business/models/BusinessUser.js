/**
 * Business User Model
 * Represents a business user account with necessary fields for API communication
 */

class BusinessUser {
  constructor({
    id = null,
    businessName = '',
    businessEmail = '',
    username = '',
    phone = '',
    address = {},
    taxId = '',
    businessType = '',
    industry = '',
    foundedDate = null,
    employeeCount = 0,
    annualRevenue = 0,
    bankAccountInfo = {},
    businessDescription = '',
    profileCompleted = false,
    profileImage = null,
    subscriptionTier = 'free',
    subscriptionExpiry = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.businessName = businessName;
    this.businessEmail = businessEmail;
    this.username = username;
    this.phone = phone;
    this.address = address;
    this.taxId = taxId;
    this.businessType = businessType;
    this.industry = industry;
    this.foundedDate = foundedDate;
    this.employeeCount = employeeCount;
    this.annualRevenue = annualRevenue;
    this.bankAccountInfo = bankAccountInfo;
    this.businessDescription = businessDescription;
    this.profileCompleted = profileCompleted;
    this.profileImage = profileImage;
    this.subscriptionTier = subscriptionTier;
    this.subscriptionExpiry = subscriptionExpiry;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Converts the BusinessUser to a plain object for API requests
   * @returns {Object} Plain JavaScript object representation for API
   */
  toAPIPayload() {
    return {
      id: this.id,
      businessName: this.businessName,
      businessEmail: this.businessEmail,
      username: this.username,
      phone: this.phone,
      address: this.address,
      taxId: this.taxId,
      businessType: this.businessType,
      industry: this.industry,
      foundedDate: this.foundedDate,
      employeeCount: this.employeeCount,
      annualRevenue: this.annualRevenue,
      bankAccountInfo: this.bankAccountInfo,
      businessDescription: this.businessDescription,
      profileCompleted: this.profileCompleted,
      profileImage: this.profileImage,
      subscriptionTier: this.subscriptionTier,
      subscriptionExpiry: this.subscriptionExpiry
    };
  }
}

export default BusinessUser;
