"use server";

import * as merchants from "@/backend/services/merchants-service";

export type UpdateMerchantKYCInput = merchants.UpdateMerchantKYCInput;
export type CompleteInductionInput = merchants.CompleteInductionInput;
export type InductMerchantInput = merchants.InductMerchantInput;
export type MerchantsByBranchFilters = merchants.MerchantsByBranchFilters;
export type MerchantDetail = merchants.MerchantDetail;
export type UpdateMerchantDetailsInput = merchants.UpdateMerchantDetailsInput;

export async function updateMerchantProductsAndKYC(input: merchants.UpdateMerchantKYCInput) {
  return merchants.updateMerchantProductsAndKYC(input);
}

export async function completeInduction(input: merchants.CompleteInductionInput) {
  return merchants.completeInduction(input);
}

export async function inductMerchant(input: merchants.InductMerchantInput) {
  return merchants.inductMerchant(input);
}

export async function getMerchantsByBranch(filters: merchants.MerchantsByBranchFilters) {
  return merchants.getMerchantsByBranch(filters);
}

export async function getMerchantDetail(merchantId: string) {
  return merchants.getMerchantDetail(merchantId);
}

export async function updateMerchantDetails(
  merchantId: string,
  data: merchants.UpdateMerchantDetailsInput
) {
  return merchants.updateMerchantDetails(merchantId, data);
}

export async function setDeploymentAssetOnboarded(
  merchantId: string,
  deploymentAssetId: string,
  onboarded: boolean
) {
  return merchants.setDeploymentAssetOnboarded(merchantId, deploymentAssetId, onboarded);
}

