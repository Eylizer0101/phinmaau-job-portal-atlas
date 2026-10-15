import api from '../../services/api';

// Reuse the same submitted resume snapshot preview as the Admin application page.
// Never rebuild historical application resumes from the current editable profile.
const openSubmittedResumePreview = async (applicationId, navigate, returnTo, returnState = null) => {
  const response = await api.get(`/applications/${applicationId}`);
  const application = response.data?.application;
  const snapshot = application?.resumeSnapshot;
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
