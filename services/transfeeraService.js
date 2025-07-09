const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class TransfeeraPIX {
    constructor(config) {
        this.baseUrl = config.sandbox ?
            'https://api.transfeera.com' :
            'https://api.mtls.transfeera.com';
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.pixKey = config.pixKey;
        this.accessToken = config.authToken;
        this.tokenExpiry = null
    }

    async authenticate() {
        try {
            const response = await axios.post(`${'https://login-api-sandbox.transfeera.com'}/oauth/token`, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret
            }, {
                headers: {
                    'Content-type': 'application/json'
                }
            });
            this.accessToken = response.data.accessToken;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        } catch (error) {
            throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
        }
    }

    // Check if token is valid
    // async ensureAuthenticated() {
    //     if (!this.accessToken || Date.now() >= this.tokenExpiry) {
    //         await this.authenticate();
    //     }
    // }

    // Get authenticated headers
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
        };
    }

    async createPixPayment(paymentData) {
        await this.ensureAuthenticated();
        const payload = {
            amount: paymentData.amount, // Amount in cents (e.g., 1000 = R$ 10.00)
            pix_key: paymentData.pixKey, // Recipient's PIX key
            description: paymentData.description || '',
            external_id: paymentData.externalId || this.generateExternalId(),
            payer: {
                name: paymentData.payer.name,
                document: paymentData.payer.document, // CPF/CNPJ
                email: paymentData.payer.email
            }
        }

        try {
            const response = await axios.post(`${this.baseUrl}/payments/pix`, payload, {
                headers: this.getHeaders()
            });

            return response.data;
        } catch (error) {
            throw new Error(`PIX payment creation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    async createPixCharge(chargeData) {
        // await this.ensureAuthenticated()
        // const payload = {
        //     amount: chargeData.amount, // Amount in cents
        //     description: chargeData.description || '',
        //     external_id: chargeData.externalId || this.generateExternalId(),
        //     pix_key: this.pixKey, // Your PIX key for receiving
        //     expires_at: chargeData.expiresAt || this.getDefaultExpiry(),
        //     customer: {
        //         name: chargeData.customer?.name || '',
        //         document: chargeData.customer?.document || '',
        //         email: chargeData.customer?.email || ''
        //     }
        // }

        const payload = {
            "amount": 1000,
            "description": "Test payment",
            "external_id": "test_123456",
            "payment_methods": ["pix"],
            "payment_method_details": {
                "pix": {
                    "pix_key": "123e4567-e89b-12d3-a456-426614174000"
                }
            },
            "payer": {
                "name": "João Silva",
                "tax_id": "11144477735"
            },
            "due_date": "2025-07-12",
            "expiration_date": "2025-07-15"
        }

        console.log("payload***********", payload);

        const response = await axios.post(`https://api-sandbox.transfeera.com/charges`, payload, {
            headers: this.getHeaders()
        }).then(res => console.log("response**********: ", res)).catch(err => {
            console.log("err*******", err.response.data)
        });

        // console.log("response*****:", response);

        // try {
        //     const response = await axios.post(`https://api-sandbox.transfeera.com/charges`, payload, {
        //         headers: this.getHeaders()
        //     });

        //     return {
        //         id: response.data.id,
        //         qr_code: response.data.qr_code,
        //         qr_code_url: response.data.qr_code_url,
        //         pix_copy_paste: response.data.pix_copy_paste,
        //         status: response.data.status,
        //         external_id: response.data.external_id
        //     }
        // } catch (error) {
        //     throw new Error(`PIX charge creation failed: ${error.response?.data.message || error.message}`);
        // }
    }

    async getPaymentStatus(paymentId) {
        // await this.ensureAuthenticated();
        try {
            const response = await axios.get(`${this.baseUrl}/payments/${paymentId}`, {
                headers: this.getHeaders()
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get payment status: ${error.response?.data?.message || error.message}`);
        }
    }

    async getChargeStatus(chargeId) {
        // await this.ensureAuthenticated();
        try {
            const response = await axios.get(`${this.baseUrl}/charge/${chargeId}`, {
                headers: this.getHeaders()
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get charge status: ${error.response?.data?.message || error.message}`);
        }
    }

    async listPayments(filters = {}) {
        // await this.ensureAuthenticated();
        try {
            const params = new URLSearchParams();
            if (filter.status) params.append('status', filters.status);
            if (filter.start_date) params.append('start_date', filter.start_date);
            if (filter.end_date) params.append('end_date', filter.end_date);
            if (filter.limit) params.append('limit', filters.limit);
            if (filter.offset) params.append('offset', filter.offset);

            const response = await axios.get(`${this.baseUrl}/payments/${params}`, {
                headers: this.getHeaders()
            });

            return response.data;

        } catch (error) {
            throw new Error(`Failed to list payments: ${error.response?.data?.message || error.message}`);
        }
    }

    async validateBankData(bankData) {
        // await this.ensureAuthenticated();

        const payload = {
            bank_code: bankData.bankCode,
            agency: bankData.agency,
            account: bankData.account,
            account_type: bankData.accountType, // 'checking' or 'savings'
            document: bankData.document // CPF/CNPJ
        }

        try {
            const response = await axios.post(`${this.baseUrl}/bank-data/validate`, payload, {
                headers: this.getHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error(`Bank data validation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    // Webhook signature validation
    validateWebhookSignature(payload, signature, secret) {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    // Utility methods
    generateExternalId() {
        return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getDefaultExpiry() {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24); // 24 hours from now
        return expiry.toISOString();
    }

    // Format amount from reais to cents
    static formatAmount(reais) {
        return Math.round(reais * 100);
    }

    // Format amount from cents to reais
    static formatAmountFromCents(cents) {
        return cents / 100;
    }
}

module.exports = {
    TransfeeraPIX
}














