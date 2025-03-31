const fs = require('fs').promises;
const path = require('path');

class InvestmentResourceService {
  /**
   * Get educational resources about investing
   * @param {string} topic - Resource topic
   * @returns {Object} Educational resources
   */
  async getResources(topic = 'general') {
    try {
      // Educational investment concepts
      const investmentConcepts = {
        general: {
          title: "Investment Basics",
          description: "Fundamental principles of investing",
          concepts: [
            {
              name: "Diversification",
              description: "Spreading investments across various assets to reduce risk",
              tips: [
                "Don't put all your eggs in one basket",
                "Different assets respond differently to market events",
                "Reduces impact of poor performance in any single investment"
              ],
              simulationApplication: "Try investing in tokens from different institutions"
            },
            {
              name: "Risk vs. Return",
              description: "Higher potential returns typically come with higher risk",
              tips: [
                "Consider your risk tolerance before investing",
                "Higher risk investments should have potential for higher returns",
                "Time horizon affects how much risk you can take"
              ],
              simulationApplication: "Different institution tokens have different volatility profiles"
            },
            {
              name: "Market Timing",
              description: "The practice of moving in and out of markets based on predictive methods",
              tips: [
                "Extremely difficult even for professionals",
                "Time in the market beats timing the market",
                "Better strategy is consistent investing over time"
              ],
              simulationApplication: "Try the Market Timing Challenge to test your skills"
            }
          ],
          furtherReading: [
            "The Intelligent Investor by Benjamin Graham",
            "A Random Walk Down Wall Street by Burton Malkiel",
            "The Little Book of Common Sense Investing by John C. Bogle"
          ]
        },
        
        volatility: {
          title: "Understanding Market Volatility",
          description: "How and why markets fluctuate",
          concepts: [
            {
              name: "Volatility",
              description: "The rate at which price changes up or down",
              tips: [
                "Measured by standard deviation of returns",
                "Higher volatility = larger price swings",
                "Not the same as risk, but related"
              ],
              simulationApplication: "Watch how news events affect token prices differently"
            },
            {
              name: "Market Sentiment",
              description: "The overall attitude of investors toward a market",
              tips: [
                "Can drive prices independent of fundamentals",
                "Often cyclical between fear and greed",
                "May create buying/selling opportunities"
              ],
              simulationApplication: "Notice how news events trigger market-wide movements"
            },
            {
              name: "Circuit Breakers",
              description: "Mechanisms to prevent extreme market movements",
              tips: [
                "Pause trading during sharp declines",
                "Give investors time to make rational decisions",
                "Important safeguard for market stability"
              ],
              simulationApplication: "Market controls prevent extreme volatility in token prices"
            }
          ],
          furtherReading: [
            "When Genius Failed by Roger Lowenstein",
            "Fooled by Randomness by Nassim Nicholas Taleb",
            "Against the Gods by Peter L. Bernstein"
          ]
        },
        
        strategy: {
          title: "Investment Strategies",
          description: "Approaches to investing for different goals",
          concepts: [
            {
              name: "Buy and Hold",
              description: "Purchasing investments and holding them for long periods",
              tips: [
                "Reduces transaction costs",
                "Takes advantage of compounding",
                "Avoids timing mistakes"
              ],
              simulationApplication: "Try the Hold Challenge to practice long-term investing"
            },
            {
              name: "Dollar-Cost Averaging",
              description: "Investing fixed amounts at regular intervals",
              tips: [
                "Smooths out purchase price over time",
                "Removes emotional decision-making",
                "Good for volatile markets"
              ],
              simulationApplication: "Set up regular token purchases to test this strategy"
            },
            {
              name: "Value Investing",
              description: "Finding undervalued assets based on fundamentals",
              tips: [
                "Look for assets priced below intrinsic value",
                "Requires research and patience",
                "Focus on long-term potential over short-term movements"
              ],
              simulationApplication: "Research institution performance metrics before investing"
            }
          ],
          furtherReading: [
            "The Essays of Warren Buffett by Lawrence Cunningham",
            "One Up On Wall Street by Peter Lynch",
            "The Little Book That Still Beats the Market by Joel Greenblatt"
          ]
        }
      };
      
      // Return requested topic or general if not found
      return {
        success: true,
        resources: investmentConcepts[topic] || investmentConcepts.general
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Get investment quiz questions
   * @param {string} difficulty - Quiz difficulty
   * @returns {Object} Quiz questions
   */
  async getQuizQuestions(difficulty = 'beginner') {
    try {
      // Quiz questions by difficulty
      const quizQuestions = {
        beginner: [
          {
            question: "What is diversification?",
            options: [
              "Putting all your money in one investment",
              "Spreading investments across different assets",
              "Only investing in stocks",
              "Investing only when markets are up"
            ],
            correctAnswer: 1,
            explanation: "Diversification means spreading your investments across different assets to reduce risk."
          },
          {
            question: "Which statement about risk and return is generally true?",
            options: [
              "Low risk always means no return",
              "High returns always come with low risk",
              "Higher potential returns typically come with higher risk",
              "Risk and return are unrelated"
            ],
            correctAnswer: 2,
            explanation: "In investing, higher potential returns typically come with higher risk."
          },
          {
            question: "What is dollar-cost averaging?",
            options: [
              "Trying to time the market perfectly",
              "Investing everything at once",
              "Investing only in dollar-denominated assets",
              "Investing fixed amounts at regular intervals"
            ],
            correctAnswer: 3,
            explanation: "Dollar-cost averaging is investing fixed amounts at regular intervals, regardless of market conditions."
          }
        ],
        
        intermediate: [
          {
            question: "What is market volatility?",
            options: [
              "The average return of a market",
              "The rate at which prices change up or down",
              "The total value of a market",
              "The number of investors in a market"
            ],
            correctAnswer: 1,
            explanation: "Volatility measures how rapidly prices change up or down, usually expressed as standard deviation."
          },
          {
            question: "What is a circuit breaker in financial markets?",
            options: [
              "A tool to fix electrical problems in trading systems",
              "A mechanism to prevent extreme market movements",
              "A strategy for timing market entries",
              "A type of derivative contract"
            ],
            correctAnswer: 1,
            explanation: "Circuit breakers temporarily halt trading during sharp market declines to prevent panic selling."
          },
          {
            question: "Which investment strategy involves purchasing stocks that appear undervalued?",
            options: [
              "Growth investing",
              "Momentum investing",
              "Value investing",
              "Index investing"
            ],
            correctAnswer: 2,
            explanation: "Value investing focuses on finding stocks trading below their intrinsic value."
          }
        ],
        
        advanced: [
          {
            question: "What effect does liquidity typically have on asset pricing?",
            options: [
              "More liquid assets typically command higher prices",
              "Less liquid assets typically command higher prices",
              "Liquidity has no effect on asset pricing",
              "Liquidity only affects bond pricing"
            ],
            correctAnswer: 1,
            explanation: "Less liquid assets typically have a liquidity premium, meaning they command higher returns (lower prices) to compensate for the difficulty in selling."
          },
          {
            question: "What is the efficient market hypothesis?",
            options: [
              "Markets always go up in the long run",
              "Stock prices reflect all available information",
              "Government regulation makes markets efficient",
              "Algorithms always beat human traders"
            ],
            correctAnswer: 1,
            explanation: "The efficient market hypothesis states that asset prices reflect all available information, making it difficult to consistently outperform the market."
          },
          {
            question: "What is a contrarian investment strategy?",
            options: [
              "Following the crowd with investments",
              "Only using technical analysis",
              "Going against prevailing market sentiment",
              "Investing only in established companies"
            ],
            correctAnswer: 2,
            explanation: "Contrarian investing involves deliberately going against current market trends, such as buying during market panics or selling during euphoria."
          }
        ]
      };
      
      // Return requested difficulty or beginner if not found
      return {
        success: true,
        quiz: quizQuestions[difficulty] || quizQuestions.beginner
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new InvestmentResourceService();