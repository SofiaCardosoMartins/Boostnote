import PropTypes from 'prop-types'
import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './TagSelect.styl'
import _ from 'lodash'
import AwsMobileAnalyticsConfig from 'browser/main/lib/AwsMobileAnalyticsConfig'
import i18n from 'browser/lib/i18n'
import ee from 'browser/main/lib/eventEmitter'
import Autosuggest from 'react-autosuggest'
import context from 'browser/lib/context'

class TagSelect extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      newTag: '',
      suggestions: [],
      tag: {
        color: props.color
      }
    }
    this.colors = ['black ', 'blue  ', 'green ', 'pink  ', 'purple', 'red   ']
    this.handleAddTag = this.handleAddTag.bind(this)
    this.onInputBlur = this.onInputBlur.bind(this)
    this.onInputChange = this.onInputChange.bind(this)
    this.onInputKeyDown = this.onInputKeyDown.bind(this)
    this.onSuggestionsClearRequested = this.onSuggestionsClearRequested.bind(this)
    this.onSuggestionsFetchRequested = this.onSuggestionsFetchRequested.bind(this)
    this.onSuggestionSelected = this.onSuggestionSelected.bind(this)
  }

  addNewTag (newTag, color = 'black ') {
    AwsMobileAnalyticsConfig.recordDynamicCustomEvent('ADD_TAG')

    newTag = newTag.trim().replace(/ +/g, '_')
    if (newTag.charAt(0) === '#') {
      newTag.substring(1)
    }

    newTag += color

    if (newTag.length <= 0) {
      this.setState({
        newTag: ''
      })
      return
    }

    let { value } = this.props
    value = _.isArray(value)
      ? value.slice()
      : []
    value.push(newTag)
    value = _.uniq(value)

    this.setState({
      newTag: ''
    }, () => {
      this.value = value
      this.props.onChange()
    })
  }

  updateTag (previousTag, newTag, color) {
    console.log(this.props.value)
    this.handleTagRemoveButtonClick(previousTag)
    console.log(this.props.value)
    this.addNewTag(newTag, color)
    console.log(this.props.value)
  }

  buildSuggestions () {
    this.suggestions = _.sortBy(this.props.data.tagNoteMap.map(
      (tag, name) => ({
        name,
        nameLC: name.toLowerCase(),
        size: tag.size
      })
    ).filter(
      tag => tag.size > 0
    ), ['name'])
  }

  componentDidMount () {
    this.value = this.props.value

    this.buildSuggestions()
    ee.on('editor:add-tag', this.handleAddTag)
  }

  componentDidUpdate () {
    this.value = this.props.value
  }

  componentWillUnmount () {
    ee.off('editor:add-tag', this.handleAddTag)
  }

  handleAddTag () {
    this.refs.newTag.input.focus()
  }

  handleTagLabelClick (tag) {
    const { router } = this.context
    router.push(`/tags/${tag}`)
  }

  handleSwitchTagColor (label, tagValue, color) {
    const tag = Object.assign({}, this.state.tag, { color: color })
    this.setState({ tag })
    this.props.color = color
    this.props.onChange()

    let tagColor = tagValue.slice(-6)
    if (!this.colors.includes(tagColor)) {
      tagValue += 'black '
    }
    let newTag = tagValue.slice(0, -6)
    this.updateTag(tagValue, newTag, color)
  }

  handleTagLabelRightClick (e, tag) {
    let label = e.target
    context.popup([
      {
        icon: 'resources/colors/blue.png',
        click: (e) => this.handleSwitchTagColor(label, tag, 'blue  ')
      },
      {
        icon: 'resources/colors/green.png',
        click: (e) => this.handleSwitchTagColor(label, tag, 'green ')
      },
      {
        icon: 'resources/colors/pink.png',
        click: (e) => this.handleSwitchTagColor(label, tag, 'pink  ')
      },
      {
        icon: 'resources/colors/purple.png',
        click: (e) => this.handleSwitchTagColor(label, tag, 'purple')
      },
      {
        icon: 'resources/colors/red.png',
        click: (e) => this.handleSwitchTagColor(label, tag, 'red   ')
      }
    ])
  }

  handleTagRemoveButtonClick (tag) {
    this.removeTagByCallback((value, tag) => {
      value.splice(value.indexOf(tag), 1)
    }, tag)
  }

  onInputBlur (e) {
    this.submitNewTag()
  }

  onInputChange (e, { newValue, method }) {
    this.setState({
      newTag: newValue
    })
  }

  onInputKeyDown (e) {
    switch (e.keyCode) {
      case 9:
        e.preventDefault()
        this.submitNewTag()
        break
      case 13:
        this.submitNewTag()
        break
      case 8:
        if (this.state.newTag.length === 0) {
          this.removeLastTag()
        }
    }
  }

  onSuggestionsClearRequested () {
    this.setState({
      suggestions: []
    })
  }

  onSuggestionsFetchRequested ({ value }) {
    const valueLC = value.toLowerCase()
    const suggestions = _.filter(
      this.suggestions,
      tag => !_.includes(this.value, tag.name) && tag.nameLC.indexOf(valueLC) !== -1
    )

    this.setState({
      suggestions
    })
  }

  onSuggestionSelected (event, { suggestion, suggestionValue }) {
    this.addNewTag(suggestionValue)
  }

  removeLastTag () {
    this.removeTagByCallback((value) => {
      value.pop()
    })
  }

  removeTagByCallback (callback, tag = null) {
    let { value } = this.props

    value = _.isArray(value)
      ? value.slice()
      : []
    callback(value, tag)
    value = _.uniq(value)

    this.value = value
    this.props.onChange()
  }

  reset () {
    this.buildSuggestions()

    this.setState({
      newTag: ''
    })
  }

  submitNewTag () {
    this.addNewTag(this.refs.newTag.input.value)
  }

  render () {
    const {value, className, showTagsAlphabetically } = this.props
    const colors = this.colors

    const tagList = _.isArray(value)
      ? (showTagsAlphabetically ? _.sortBy(value) : value).map((tag) => {
        let tagName = tag.slice(0, -6)
        let color = tag.slice(-6)
        if (!colors.includes(color)) {
          color = 'black'
          tagName = tag
        }
        return (
          <span styleName='tag'
            key={tag}
          >
            <span style={{color: color}} styleName='tag-label' onClick={(e) => this.handleTagLabelClick(tag)} onContextMenu={(e) => this.handleTagLabelRightClick(e, tag)}>#{tagName}</span>
            <button styleName='tag-removeButton'
              onClick={(e) => this.handleTagRemoveButtonClick(tag)}
            >
              <img className='tag-removeButton-icon' src='../resources/icon/icon-x.svg' width='8px' />
            </button>
          </span>
        )
      })
      : []

    const { newTag, suggestions } = this.state
    console.log(suggestions)
    let suggestionsWithoutColor = []
    for (let i = 0; i < suggestions.length; i++) {
      let suggestion = suggestions[i]
      suggestionsWithoutColor.push(suggestion)
      let color = suggestion.name.slice(-6)
      if (colors.includes(color)) {
        suggestionsWithoutColor[i].name = suggestion.name.slice(0, -6)
      }
    }

    return (
      <div className={_.isString(className)
          ? 'TagSelect ' + className
          : 'TagSelect'
        }
        styleName='root'
      >
        {tagList}
        <Autosuggest
          ref='newTag'
          suggestions={suggestionsWithoutColor}
          onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
          onSuggestionsClearRequested={this.onSuggestionsClearRequested}
          onSuggestionSelected={this.onSuggestionSelected}
          getSuggestionValue={suggestion => suggestion.name}
          renderSuggestion={suggestion => (
            <div>
              {suggestion.name}
            </div>
          )}
          inputProps={{
            placeholder: i18n.__('Add tag...'),
            value: newTag,
            onChange: this.onInputChange,
            onKeyDown: this.onInputKeyDown,
            onBlur: this.onInputBlur
          }}
        />
      </div>
    )
  }
}

TagSelect.contextTypes = {
  router: PropTypes.shape({})
}

TagSelect.propTypes = {
  className: PropTypes.string,
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func,
  color: PropTypes.string
}

export default CSSModules(TagSelect, styles)
