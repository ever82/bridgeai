/**
 * OpenAPI Configuration
 * BridgeAI API v1
 *
 * Shared OpenAPI configuration components
 */
export declare const openApiInfo: {
    title: string;
    version: string;
    description: string;
    contact: {
        name: string;
        email: string;
    };
    'x-api-version': string;
    'x-deprecated-versions': any[];
};
export declare const openApiServers: {
    url: string;
    description: string;
}[];
export declare const openApiComponents: {
    securitySchemes: {
        bearerAuth: {
            type: string;
            scheme: string;
            bearerFormat: string;
            description: string;
        };
    };
    schemas: {
        ApiResponse: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                data: {
                    type: string;
                };
                message: {
                    type: string;
                };
                error: {
                    type: string;
                };
                code: {
                    type: string;
                };
            };
        };
        ApiSuccess: {
            type: string;
            properties: {
                success: {
                    type: string;
                    example: boolean;
                };
                message: {
                    type: string;
                };
            };
        };
        User: {
            type: string;
            properties: {
                id: {
                    type: string;
                    format: string;
                    description: string;
                };
                email: {
                    type: string;
                    format: string;
                    description: string;
                };
                name: {
                    type: string;
                    description: string;
                };
                avatarUrl: {
                    type: string;
                    format: string;
                    description: string;
                };
                phone: {
                    type: string;
                    description: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                role: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                createdAt: {
                    type: string;
                    format: string;
                    description: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                    description: string;
                };
            };
        };
        Agent: {
            type: string;
            properties: {
                id: {
                    type: string;
                    format: string;
                };
                userId: {
                    type: string;
                    format: string;
                };
                name: {
                    type: string;
                };
                type: {
                    type: string;
                    enum: string[];
                };
                status: {
                    type: string;
                    enum: string[];
                };
                config: {
                    type: string;
                };
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
            };
        };
        Tokens: {
            type: string;
            properties: {
                accessToken: {
                    type: string;
                    description: string;
                };
                refreshToken: {
                    type: string;
                    description: string;
                };
                expiresIn: {
                    type: string;
                    description: string;
                };
            };
        };
        Error: {
            type: string;
            properties: {
                success: {
                    type: string;
                    example: boolean;
                };
                error: {
                    type: string;
                    description: string;
                };
                code: {
                    type: string;
                    description: string;
                };
            };
        };
        Pagination: {
            type: string;
            properties: {
                page: {
                    type: string;
                };
                limit: {
                    type: string;
                };
                total: {
                    type: string;
                };
                totalPages: {
                    type: string;
                };
                hasMore: {
                    type: string;
                };
            };
        };
        Merchant: {
            type: string;
            properties: {
                id: {
                    type: string;
                    format: string;
                };
                agentId: {
                    type: string;
                    format: string;
                };
                name: {
                    type: string;
                };
                address: {
                    type: string;
                };
                phone: {
                    type: string;
                };
                description: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
            };
        };
        Offer: {
            type: string;
            properties: {
                id: {
                    type: string;
                    format: string;
                };
                merchantId: {
                    type: string;
                    format: string;
                };
                title: {
                    type: string;
                };
                description: {
                    type: string;
                };
                type: {
                    type: string;
                    enum: string[];
                };
                status: {
                    type: string;
                    enum: string[];
                };
                originalPrice: {
                    type: string;
                };
                offerPrice: {
                    type: string;
                };
                stock: {
                    type: string;
                };
                startDate: {
                    type: string;
                    format: string;
                };
                endDate: {
                    type: string;
                    format: string;
                };
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
            };
        };
        Review: {
            type: string;
            properties: {
                id: {
                    type: string;
                    format: string;
                };
                reviewerId: {
                    type: string;
                    format: string;
                };
                targetId: {
                    type: string;
                    format: string;
                };
                rating: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                comment: {
                    type: string;
                };
                reply: {
                    type: string;
                };
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
            };
        };
        Job: {
            type: string;
            properties: {
                id: {
                    type: string;
                    format: string;
                };
                title: {
                    type: string;
                };
                description: {
                    type: string;
                };
                company: {
                    type: string;
                };
                location: {
                    type: string;
                };
                salaryMin: {
                    type: string;
                };
                salaryMax: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                };
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
            };
        };
        DisclosureSettings: {
            type: string;
            properties: {
                agentId: {
                    type: string;
                    format: string;
                };
                levels: {
                    type: string;
                    description: string;
                    additionalProperties: {
                        type: string;
                        enum: string[];
                    };
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
            };
        };
        ConsumerAgent: {
            type: string;
            properties: {
                id: {
                    type: string;
                    format: string;
                };
                userId: {
                    type: string;
                    format: string;
                };
                categories: {
                    type: string;
                    items: {
                        type: string;
                    };
                    maxItems: number;
                };
                budget: {
                    type: string;
                    properties: {
                        min: {
                            type: string;
                        };
                        max: {
                            type: string;
                        };
                    };
                };
                preferences: {
                    type: string;
                };
                timeline: {
                    type: string;
                };
                location: {
                    type: string;
                };
                status: {
                    type: string;
                };
                createdAt: {
                    type: string;
                    format: string;
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
            };
        };
        CreditScore: {
            type: string;
            properties: {
                score: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                level: {
                    type: string;
                    enum: string[];
                };
                updatedAt: {
                    type: string;
                    format: string;
                };
            };
        };
        Notification: {
            type: string;
            properties: {
                id: {
                    type: string;
                    format: string;
                };
                type: {
                    type: string;
                };
                title: {
                    type: string;
                };
                body: {
                    type: string;
                };
                read: {
                    type: string;
                };
                createdAt: {
                    type: string;
                    format: string;
                };
            };
        };
        Location: {
            type: string;
            properties: {
                code: {
                    type: string;
                    description: string;
                };
                name: {
                    type: string;
                    description: string;
                };
                level: {
                    type: string;
                    description: string;
                };
                parentCode: {
                    type: string;
                    description: string;
                };
            };
        };
        SceneConfig: {
            type: string;
            properties: {
                id: {
                    type: string;
                };
                name: {
                    type: string;
                };
                description: {
                    type: string;
                };
                icon: {
                    type: string;
                };
                active: {
                    type: string;
                };
                capabilities: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
                fields: {
                    type: string;
                    items: {
                        type: string;
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=swagger.d.ts.map