import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trading Journal API',
      version: '1.0.0',
      description: 'API documentation for the Trading Journal application',
      contact: {
        name: 'API Support',
        email: 'support@tradingjournal.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    example: 'Email is required'
                  }
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'User account status'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            }
          }
        },
        Trade: {
          type: 'object',
          required: ['symbol', 'type', 'entry', 'quantity', 'date'],
          properties: {
            id: {
              type: 'string',
              description: 'Trade ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            symbol: {
              type: 'string',
              description: 'Trading symbol'
            },
            type: {
              type: 'string',
              enum: ['buy', 'sell'],
              description: 'Trade type'
            },
            entry: {
              type: 'number',
              description: 'Entry price'
            },
            exit: {
              type: 'number',
              description: 'Exit price'
            },
            quantity: {
              type: 'number',
              description: 'Trade quantity'
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Trade date'
            },
            profit: {
              type: 'number',
              description: 'Trade profit/loss'
            },
            notes: {
              type: 'string',
              description: 'Trade notes'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Trade tags'
            }
          }
        },
        Analysis: {
          type: 'object',
          required: ['userId', 'tradeId', 'metrics', 'period'],
          properties: {
            id: {
              type: 'string',
              description: 'Analysis ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            tradeId: {
              type: 'string',
              description: 'Trade ID'
            },
            metrics: {
              type: 'object',
              properties: {
                riskRewardRatio: {
                  type: 'number',
                  description: 'Risk to reward ratio'
                },
                winRate: {
                  type: 'number',
                  description: 'Win rate percentage'
                },
                profitFactor: {
                  type: 'number',
                  description: 'Profit factor'
                },
                averageWin: {
                  type: 'number',
                  description: 'Average winning trade'
                },
                averageLoss: {
                  type: 'number',
                  description: 'Average losing trade'
                }
              }
            },
            period: {
              type: 'object',
              properties: {
                start: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Period start date'
                },
                end: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Period end date'
                }
              }
            }
          }
        },
        Account: {
          type: 'object',
          required: ['userId', 'balance', 'currency', 'broker'],
          properties: {
            id: {
              type: 'string',
              description: 'Account ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            balance: {
              type: 'number',
              description: 'Account balance'
            },
            currency: {
              type: 'string',
              description: 'Account currency'
            },
            broker: {
              type: 'string',
              description: 'Broker name'
            },
            isActive: {
              type: 'boolean',
              description: 'Account status'
            }
          }
        },
        JournalEntry: {
          type: 'object',
          required: ['userId', 'title', 'content'],
          properties: {
            id: {
              type: 'string',
              description: 'Journal entry ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            tradeId: {
              type: 'string',
              description: 'Related trade ID'
            },
            title: {
              type: 'string',
              description: 'Entry title'
            },
            content: {
              type: 'string',
              description: 'Entry content'
            },
            mood: {
              type: 'string',
              enum: ['positive', 'neutral', 'negative'],
              description: 'Entry mood'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Entry tags'
            }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options); 