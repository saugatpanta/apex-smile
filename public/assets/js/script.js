class RegistrationForm {
    constructor() {
        this.state = { 
            activeTab: 'inter', 
            formData: { inter: {}, intra: {} },
            currentRegistration: null
        };
        
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbwcNYJlfoKARbY3Xn6W--EXr-_pWKGW6oJhGHhy6baJuDN4PYnb_YGGWuhD3iRMu43t9Q/exec';
        this.popupCallbacks = {
            confirm: null,
            cancel: null
        };
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupFileUploads();
        this.activateDefaultTab();
        this.setupRulesToggle();
        this.checkPreviousRegistration();
    }

    async checkPreviousRegistration() {
        const lastRegistrationId = localStorage.getItem('lastRegistrationId');
        if (lastRegistrationId) {
            try {
                const response = await this.checkRegistrationStatus(lastRegistrationId);
                if (response && response.status === 'success') {
                    this.showAlert(`Welcome back! Your previous registration ID is ${lastRegistrationId}.`, 'info');
                }
            } catch (error) {
                console.error('Error checking registration status:', error);
                localStorage.removeItem('lastRegistrationId');
            }
        }
    }

    async checkRegistrationStatus(registrationId) {
        try {
            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'getRegistrationDetails',
                    registrationId: registrationId
                }),
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message || 'Registration not found');
            }

            return data;
        } catch (error) {
            console.error('Error checking registration:', error);
            throw error;
        }
    }

    cacheElements() {
        this.elements = {
            tabs: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            forms: {
                inter: document.getElementById('interForm'),
                intra: document.getElementById('intraForm')
            },
            uploads: {
                inter: document.getElementById('interPaymentUpload'),
                intra: document.getElementById('intraPaymentUpload')
            },
            alerts: {
                box: document.getElementById('alertBox'),
                success: document.getElementById('successContainer'),
                registrationId: document.getElementById('registrationIdDisplay')
            },
            newRegBtn: document.getElementById('newRegistrationBtn'),
            downloadReceiptBtn: document.getElementById('downloadReceiptBtn'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            formTabs: document.getElementById('formTabs'),
            container: document.querySelector('.container'),
            rulesHeaders: document.querySelectorAll('.rules-header'),
            rulesContents: document.querySelectorAll('.rules-content'),
            popupModal: document.getElementById('popupModal'),
            popupTitle: document.getElementById('popupTitle'),
            popupContent: document.getElementById('popupContent'),
            popupConfirmBtn: document.getElementById('popupConfirmBtn'),
            popupCancelBtn: document.getElementById('popupCancelBtn'),
            modalCloseBtn: document.getElementById('modalCloseBtn')
        };
    }

    bindEvents() {
        this.elements.tabs.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        this.elements.forms.inter?.addEventListener('submit', (e) => this.handleSubmit(e, 'inter'));
        this.elements.forms.intra?.addEventListener('submit', (e) => this.handleSubmit(e, 'intra'));
        
        document.querySelectorAll('input[name="competitionType"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleCompetitionChange(e));
        });

        this.elements.newRegBtn?.addEventListener('click', () => this.resetForm());
        this.elements.downloadReceiptBtn?.addEventListener('click', () => this.generateReceipt());
        
        this.setupRealTimeValidation();
    }

    setupRulesToggle() {
        const rulesHeaders = document.querySelectorAll('.rules-header');
        const rulesContents = document.querySelectorAll('.rules-content');

        rulesContents.forEach(content => {
            content.style.maxHeight = '0';
            content.style.overflow = 'hidden';
            content.style.transition = 'max-height 0.3s ease-out';
        });

        rulesHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const contentId = header.getAttribute('data-target') || 
                                 header.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (!contentId) return;
                
                const content = document.getElementById(contentId);
                if (!content) return;
                
                const icon = header.querySelector('i');
                
                content.classList.toggle('active');
                
                if (icon) {
                    icon.classList.toggle('fa-chevron-down');
                    icon.classList.toggle('fa-chevron-up');
                }
                
                if (content.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                } else {
                    content.style.maxHeight = '0';
                }
            });

            header.removeAttribute('onclick');
        });
    }

    setupRealTimeValidation() {
        document.getElementById('interName')?.addEventListener('input', (e) => {
            this.validateField(e.target, 'interNameError', (value) => value.length >= 2);
        });
        
        document.getElementById('intraName')?.addEventListener('input', (e) => {
            this.validateField(e.target, 'intraNameError', (value) => value.length >= 2);
        });
        
        document.getElementById('interEmail')?.addEventListener('input', (e) => {
            this.validateField(e.target, 'interEmailError', (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
        });
        
        document.getElementById('intraEmail')?.addEventListener('input', (e) => {
            this.validateField(e.target, 'intraEmailError', (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
        });
        
        document.getElementById('interContact')?.addEventListener('input', (e) => {
            this.validateField(e.target, 'interContactError', (value) => /^[0-9]{10,15}$/.test(value));
        });
        
        document.getElementById('intraContact')?.addEventListener('input', (e) => {
            this.validateField(e.target, 'intraContactError', (value) => /^[0-9]{10,15}$/.test(value));
        });
        
        document.getElementById('interAddress')?.addEventListener('input', (e) => {
            this.validateField(e.target, 'interAddressError', (value) => value.length >= 5);
        });
        
        document.getElementById('interCollegeName')?.addEventListener('input', (e) => {
            this.validateField(e.target, 'interCollegeError', (value) => value.length >= 2);
        });
        
        document.getElementById('intraProgram')?.addEventListener('change', (e) => {
            this.validateField(e.target, 'intraProgramError', (value) => value !== '');
        });
        
        document.getElementById('intraSemester')?.addEventListener('change', (e) => {
            this.validateField(e.target, 'intraSemesterError', (value) => value !== '');
        });
    }

    validateField(field, errorId, validationFn) {
        const errorElement = document.getElementById(errorId);
        if (!errorElement) return;
        
        const value = field.value.trim();
        
        if (!validationFn(value)) {
            errorElement.style.display = 'block';
            field.classList.add('error');
        } else {
            errorElement.style.display = 'none';
            field.classList.remove('error');
        }
    }

    activateDefaultTab() {
        const defaultTab = document.querySelector('.tab-btn[data-tab="inter"]');
        if (defaultTab) {
            this.switchTab({ currentTarget: defaultTab });
        }
    }

    setupFileUploads() {
        ['inter', 'intra'].forEach(formType => {
            const area = this.elements.uploads[formType];
            const input = document.getElementById(`${formType}PaymentProof`);
            const preview = document.getElementById(`${formType}FilePreview`);
            
            if (!area || !input || !preview) return;
            
            area.addEventListener('click', () => input.click());
            
            input.addEventListener('change', (e) => {
                this.handleFileUpload(e, formType, preview);
            });
        });
    }

    handleFileUpload(event, formType, preview) {
        const file = event.target.files?.[0];
        if (!file) return;
        
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
            this.showAlert('Invalid file (5MB max, JPEG/PNG/GIF/WebP)', 'danger');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            this.state.formData[formType].paymentProof = {
                data: e.target.result.split(',')[1],
                type: file.type,
                name: file.name
            };
            
            const paymentError = document.getElementById(`${formType}PaymentError`);
            if (paymentError) paymentError.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async handleSubmit(event, formType) {
        event.preventDefault();
        
        this.showPopup(
            'Confirm Registration',
            'Are you sure you want to submit your registration? Please verify all information is correct.',
            async () => {
                if (!this.validateForm(formType)) {
                    const firstError = event.target.querySelector('.error');
                    if (firstError) {
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    return;
                }
                
                const formData = this.gatherFormData(formType);
                this.processPaymentProof(formData, formType);
                
                const submitBtn = event.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                }
                
                this.showLoadingOverlay();
                
                this.state.currentRegistration = {
                    ...formData,
                    formType: formType
                };
                
                try {
                    const result = await this.submitToBackend(formData);
                    this.handleSuccess(result, formType, submitBtn);
                } catch (error) {
                    this.handleFailure(error, formType, submitBtn);
                }
            },
            () => {
                this.showAlert('Registration cancelled', 'info');
            }
        );
    }

    showLoadingOverlay() {
        if (!this.elements.loadingOverlay) return;
        
        this.elements.loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Processing your registration...</p>
            </div>
        `;
        this.elements.loadingOverlay.style.display = 'flex';
    }

    async submitToBackend(formData) {
        try {
            let response;
            try {
                response = await fetch(this.scriptUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'submitRegistration',
                        formData: formData
                    }),
                    mode: 'cors'
                });
            } catch (corsError) {
                console.log('CORS request failed, trying no-cors mode');
                response = await fetch(this.scriptUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'submitRegistration',
                        formData: formData
                    }),
                    mode: 'no-cors'
                });
                
                return {
                    status: 'success',
                    details: {
                        registrationId: 'TEMP-' + Math.random().toString(36).substring(2, 10),
                        timestamp: new Date().toISOString(),
                        paymentStatus: 'Pending'
                    }
                };
            }
            
            if (!response.ok) {
                let errorMessage = 'Network response was not ok';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message || 'Registration failed');
            }
            
            return data;
        } catch (error) {
            console.error('Submission error:', error);
            throw new Error(`Failed to submit registration: ${error.message}`);
        }
    }

    handleFailure(error, formType, submitBtn) {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
        
        let userMessage = error.message;
        if (error.message.includes('NetworkError')) {
            userMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('already registered')) {
            userMessage = 'This email or phone number is already registered.';
        }
        
        this.showAlert(`Registration failed: ${userMessage}`, 'danger');
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Registration';
        }
    }

    gatherFormData(formType) {
        const form = this.elements.forms[formType];
        if (!form) return {};
        
        const formData = new FormData(form);
        const competitionType = form.querySelector('input[name="competitionType"]:checked')?.value || '';
        
        const data = {
            formType,
            competitionType,
            name: formData.get('name') || '',
            email: formData.get('email') || '',
            contact: formData.get('contact') || ''
        };
        
        if (formType === 'inter') {
            data.address = formData.get('address') || '';
            data.college = formData.get('college') || '';
        } else {
            data.program = formData.get('program') || '';
            data.semester = formData.get('semester') || '';
        }
        
        if (this.state.formData[formType]?.paymentProof) {
            data.paymentProof = this.state.formData[formType].paymentProof.data;
            data.paymentProofType = this.state.formData[formType].paymentProof.type;
        } else {
            data.paymentProof = 'N/A';
            data.paymentProofType = '';
        }
        
        return data;
    }

    processPaymentProof(data, formType) {
        if (!this.requiresPaymentProof(formType, data.competitionType)) {
            data.paymentProof = 'N/A';
            data.paymentProofType = '';
        }
    }

    requiresPaymentProof(formType, competitionType) {
        return true;
    }

    validateForm(formType) {
        const form = this.elements.forms[formType];
        if (!form) return false;
        
        let isValid = true;
        
        form.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
        });
        
        const fieldsToValidate = [
            { id: `${formType}Name`, type: 'text', min: 2 },
            { id: `${formType}Email`, type: 'email' },
            { id: `${formType}Contact`, type: 'tel' },
            ...(formType === 'inter' ? [
                { id: 'interAddress', type: 'text', min: 5 },
                { id: 'interCollegeName', type: 'text', min: 2 }
            ] : [
                { id: 'intraProgram', type: 'select' },
                { id: 'intraSemester', type: 'select' }
            ])
        ];
        
        fieldsToValidate.forEach(field => {
            const element = document.getElementById(field.id);
            const errorElement = document.getElementById(`${field.id}Error`);
            
            if (!element || !errorElement) return;
            
            let valid = true;
            const value = element.value.trim();
            
            if (field.type === 'select') {
                valid = value !== '';
            } else if (field.min) {
                valid = value.length >= field.min;
            } else if (field.type === 'email') {
                valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            } else if (field.type === 'tel') {
                valid = /^[0-9]{10,15}$/.test(value);
            }
            
            if (!valid) {
                errorElement.style.display = 'block';
                element.classList.add('error');
                isValid = false;
            } else {
                element.classList.remove('error');
            }
        });
        
        const paymentError = document.getElementById(`${formType}PaymentError`);
        if (paymentError) {
            if (!this.state.formData[formType]?.paymentProof) {
                paymentError.style.display = 'block';
                isValid = false;
            } else {
                paymentError.style.display = 'none';
            }
        }
        
        return isValid;
    }

    handleSuccess(response, formType, submitBtn) {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Registration';
        }
        
        if (response && response.status === 'success') {
            if (this.elements.alerts.registrationId) {
                this.elements.alerts.registrationId.textContent = response.details.registrationId;
            }
            if (this.elements.alerts.success) {
                this.elements.alerts.success.style.display = 'block';
            }
            
            if (this.elements.tabContents) {
                this.elements.tabContents.forEach(content => {
                    content.style.display = 'none';
                });
            }
            if (this.elements.formTabs) {
                this.elements.formTabs.style.display = 'none';
            }
            
            this.scrollToElement(this.elements.alerts.success, 600);
            
            if (response.details.registrationId) {
                localStorage.setItem('lastRegistrationId', response.details.registrationId);
            }
        } else {
            this.showAlert('Registration successful but received unexpected response from server. Please contact support with your details.', 'warning');
        }
    }

    resetForm() {
        ['inter', 'intra'].forEach(formType => {
            const form = this.elements.forms[formType];
            if (form) form.reset();
            
            const preview = document.getElementById(`${formType}FilePreview`);
            if (preview) {
                preview.style.display = 'none';
                preview.src = '';
            }
            
            const fileInput = document.getElementById(`${formType}PaymentProof`);
            if (fileInput) fileInput.value = '';
            
            this.state.formData[formType] = {};
        });
        
        if (this.elements.alerts.success) {
            this.elements.alerts.success.style.display = 'none';
        }
        if (this.elements.formTabs) {
            this.elements.formTabs.style.display = 'flex';
        }
        if (this.elements.tabContents) {
            this.elements.tabContents.forEach(content => {
                content.style.display = 'none';
            });
        }
        
        this.activateDefaultTab();
        
        const submitButtons = document.querySelectorAll('button[type="submit"]');
        submitButtons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = 'Submit Registration';
        });
        
        this.scrollToElement(this.elements.container, 600);
    }

    switchTab(event) {
        const tabId = event.currentTarget.dataset.tab;
        
        if (this.elements.tabs) {
            this.elements.tabs.forEach(btn => {
                if (btn.dataset.tab === tabId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        if (this.elements.tabContents) {
            this.elements.tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.add('active');
                    content.style.display = 'block';
                } else {
                    content.classList.remove('active');
                    content.style.display = 'none';
                }
            });
        }
    }

    scrollToElement(element, duration = 400) {
        if (!element) return;
        
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;
        
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - headerHeight - 30;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const startTime = performance.now();
        
        const scrollStep = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : -1 + (4 - 2 * progress) * progress;
                
            window.scrollTo(0, startPosition + distance * easeProgress);
            
            if (progress < 1) {
                window.requestAnimationFrame(scrollStep);
            }
        };
        
        window.requestAnimationFrame(scrollStep);
    }

    handleCompetitionChange(event) {
        const form = event.target.closest('form');
        if (!form) return;
        
        const formType = form.id.replace('Form', '');
        const paymentMethods = form.querySelectorAll('.payment-method');
        
        paymentMethods.forEach(method => {
            method.classList.remove('active');
        });
        
        const methodId = `${formType}${event.target.value.replace(/\s+/g, '')}Payment`;
        const methodElement = document.getElementById(methodId);
        if (methodElement) methodElement.classList.add('active');
    }

    showAlert(message, type) {
        const alertBox = this.elements.alerts.box;
        if (!alertBox) return;
        
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.style.display = 'block';
        
        this.scrollToElement(alertBox, 300);
        
        setTimeout(() => {
            alertBox.style.display = 'none';
        }, 5000);
    }

    generateReceipt() {
        if (!window.jspdf || !this.elements.alerts.registrationId || !this.state.currentRegistration) {
            this.showAlert('PDF generation library not loaded. Please try again later.', 'danger');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.addImage('https://i.postimg.cc/ctKSwrkj/Smile-logo.png', 'PNG', 85, 15, 40, 40);
            
            doc.setFontSize(20);
            doc.setTextColor(108, 92, 231);
            doc.text('Apex Smile Festival 2025', 105, 65, { align: 'center' });
            
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Registration Receipt', 105, 75, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text(`Registration ID: ${this.elements.alerts.registrationId.textContent}`, 20, 90);
            doc.text(`Name: ${this.state.currentRegistration.name}`, 20, 100);
            doc.text(`Email: ${this.state.currentRegistration.email}`, 20, 110);
            doc.text(`Contact: ${this.state.currentRegistration.contact}`, 20, 120);
            doc.text(`Competition: ${this.state.currentRegistration.competitionType}`, 20, 130);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 140);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Thank you for registering!', 105, 180, { align: 'center' });
            doc.text('Present this receipt at the event entrance', 105, 185, { align: 'center' });
            
            doc.save(`ApexSmileFestival_${this.elements.alerts.registrationId.textContent}.pdf`);
        } catch (error) {
            console.error('Error generating receipt:', error);
            this.showAlert('Failed to generate receipt. Please try again.', 'danger');
        }
    }

    showPopup(title, content, confirmCallback = null, cancelCallback = null) {
        this.elements.popupTitle.textContent = title;
        this.elements.popupContent.innerHTML = content;

        this.popupCallbacks.confirm = confirmCallback;
        this.popupCallbacks.cancel = cancelCallback;

        this.elements.popupConfirmBtn.style.display = confirmCallback ? 'flex' : 'none';
        this.elements.popupCancelBtn.style.display = cancelCallback ? 'flex' : 'none';

        this.elements.popupModal.classList.add('active');

        const hideModal = () => this.elements.popupModal.classList.remove('active');
        
        if (confirmCallback) {
            this.elements.popupConfirmBtn.onclick = () => {
                confirmCallback();
                hideModal();
            };
        }

        if (cancelCallback) {
            this.elements.popupCancelBtn.onclick = () => {
                if (cancelCallback) cancelCallback();
                hideModal();
            };
        }

        this.elements.modalCloseBtn.onclick = hideModal;
    }

    hidePopup() {
        this.elements.popupModal.classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RegistrationForm();
});
