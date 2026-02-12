import { t } from '../../i18n';

export function buildPrivacyPolicyHtml(): string {
  return `
  <div id="privacyPolicyModal" class="overlay hidden" role="dialog" aria-modal="true" aria-label="${t('privacy.title')}">
    <h2>${t('privacy.title')}</h2>
    <div class="privacy-content" style="text-align: left; max-width: 600px; margin: 0 auto; overflow-y: auto; max-height: 60vh; font-size: 0.9em; line-height: 1.5;">
      <p><strong>${t('privacy.section1Title')}</strong><br>
      ${t('privacy.section1Body')}</p>

      <p><strong>${t('privacy.section2Title')}</strong><br>
      ${t('privacy.section2Body')}</p>

      <p><strong>${t('privacy.section3Title')}</strong><br>
      ${t('privacy.section3Body')}</p>
    </div>
    <div class="privacy-actions" style="margin-top: 20px;">
      <button id="privacyCloseBtn" type="button">${t('button.close')}</button>
    </div>
  </div>
`;
}
