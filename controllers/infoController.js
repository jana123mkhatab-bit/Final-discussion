
const ContactMessage = require('../models/ContactMessage');

exports.getAbout          = (req, res) => res.render('info/about');
exports.getCareers        = (req, res) => res.render('info/careers');
exports.getContact        = (req, res) => res.render('info/contact', { success: null, error: null });
exports.getFaq            = (req, res) => res.render('info/faq');

exports.postContact = async (req, res, next) => {
  try {
    const { name, email, topic, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).render('info/contact', {
        error: 'Name, email, and message are required.',
        success: null
      });
    }
    await ContactMessage.create({ name: name.trim(), email: email.trim(), topic: topic || 'General Question', message: message.trim() });
    res.render('info/contact', { success: 'Your message has been sent! We\'ll reply within 24h.', error: null });
  } catch (err) {
    next(err);
  }
};
exports.getGuidelines     = (req, res) => res.render('info/guidelines');
exports.getHelpCenter     = (req, res) => res.render('info/help-center');
exports.getHowItWorks     = (req, res) => res.render('info/how-it-works');
exports.getOurStory       = (req, res) => res.render('info/our-story');
exports.getSuccessStories = (req, res) => res.render('info/success-stories');
exports.getSustainability = (req, res) => res.render('info/sustainability');
exports.getTerms          = (req, res) => res.render('info/terms');
exports.getTrustSafety    = (req, res) => res.render('info/trust-safety');
