import api from '../../services/api';

// Use a small, authorized snapshot-only endpoint instead of full application details.
// Never rebuild historical application resumes from the current editable profile.
// An immutable submitted snapshot can be reused within the same logged-in session.
// Keep concurrent hover/click requests from fetching the same snapshot twice.
const snapshotCache = new Map();
const pendingSnapshots = new Map();

const getCacheKey = (applicationId) =>
  `${localStorage.getItem('token') || ''}:${applicationId}`;

export const preloadSubmittedResume = (applicationId) => {
  if (!applicationId) return Promise.resolve(null);
  const key = getCacheKey(applicationId);
  if (snapshotCache.has(key)) return Promise.resolve(snapshotCache.get(key));
  if (pendingSnapshots.has(key)) return pendingSnapshots.get(key);

  const request = api.get(`/applications/${applicationId}/submitted-resume`)
    .then((response) => {
      const snapshot = response.data?.resumeSnapshot;
      if (!snapshot || typeof snapshot !== 'object' || !Object.keys(snapshot).length) {
        throw new Error('The submitted resume is not available for this application.');
      }
      snapshotCache.set(key, snapshot);
      return snapshot;
    })
    .finally(() => pendingSnapshots.delete(key));
  pendingSnapshots.set(key, request);
  return request;
};

const openSubmittedResumePreview = async (applicationId, navigate, returnTo, returnState = null) => {
  const snapshot = await preloadSubmittedResume(applicationId);
  if (!snapshot || typeof snapshot !== 'object' || !Object.keys(snapshot).length) {
    throw new Error('The submitted resume is not available for this application.');
  }
  const snapshotUser = snapshot.userData || snapshot.user || {};
  const snapshotProfile = snapshot.formData || snapshot.resumeData || snapshot.profile || {};
  const formData = {
    ...snapshotProfile,
    firstName: snapshotProfile.firstName || snapshotUser.firstName || '',
    middleName: snapshotProfile.middleName || snapshotUser.middleName || '',
    lastName: snapshotProfile.lastName || snapshotUser.lastName || '',
    extensionName: snapshotProfile.extensionName || snapshotUser.extensionName || '',
    email: snapshotProfile.email || snapshotUser.email || '',
    profileImage: snapshotProfile.profileImage || snapshotUser.profileImage || '',
    phoneNumber: snapshotProfile.phoneNumber || snapshotProfile.mobileNumber || snapshotUser.phoneNumber || snapshotUser.contactNumber || '',
  };
  sessionStorage.setItem('resumePreviewData', JSON.stringify({
    userData: { ...snapshotUser, profileImage: formData.profileImage },
    formData,
    workExperiences: snapshot.workExperiences || formData.workExperiences || formData.workExperience || [],
    returnTo,
    returnState,
    viewerMode: 'jobseeker',
  }));
  navigate('/jobseeker/my-profile/preview-resume', { state: { returnTo, returnState } });
};

export default openSubmittedResumePreview;
