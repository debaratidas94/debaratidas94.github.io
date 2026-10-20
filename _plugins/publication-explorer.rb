require 'bibtex'
require 'json'

module Jekyll
  class PublicationExplorerGenerator < Generator
    safe true
    priority :low

    def generate(site)
      scholar = site.config.fetch('scholar')
      source = scholar.fetch('source').sub(/\A[\/\\]+/, '')
      path = site.in_source_dir(source, scholar.fetch('bibliography'))
      themes = site.data.fetch('research_focus')
      known_themes = themes.map { |theme| theme.fetch('tag') }
      entries = BibTeX.open(path).entries.values
      raise Errors::FatalException, 'No publications found for the publication explorer' if entries.empty?

      papers = entries.map do |entry|
        theme_tags = entry[:research_themes].to_s.split(',').map(&:strip)
        unless !theme_tags.empty? && theme_tags.uniq == theme_tags && (theme_tags - known_themes).empty?
          raise Errors::FatalException, "Missing, duplicate or unknown research_themes for #{entry.key}: #{theme_tags.inspect}"
        end

        author_names = entry.author.to_a.map do |author|
          {
            'name' => [author.first, author.prefix, author.last, author.suffix].map(&:to_s).reject(&:empty?).join(' '),
            'isSelf' => Array(scholar.fetch('first_name')).include?(author.first.to_s) &&
              Array(scholar.fetch('last_name')).include?(author.last.to_s.delete('*'))
          }
        end
        {
          'key' => entry.key,
          'title' => entry.title.to_s.gsub(/[{}]/, ''),
          'year' => Integer(entry.year.to_s),
          'areas' => entry.keywords.to_s.split(',').map(&:strip),
          'themes' => theme_tags,
          'venue' => entry.abbr.to_s.strip.downcase,
          'url' => [entry[:pdf], entry[:html]].map(&:to_s).find { |url| !url.empty? }.to_s,
          'website' => entry[:website].to_s,
          'authors' => entry.author.to_s,
          'authorDisplay' => author_names.map { |author| author['name'] }.join(', '),
          'authorNames' => author_names,
          'publication' => (entry[:booktitle] || entry[:journal] || entry[:note]).to_s.gsub(/[{}]/, '')
        }
      end
      unless papers.map { |paper| paper['key'] }.uniq.length == papers.length
        raise Errors::FatalException, 'Duplicate publication explorer keys'
      end

      data = {
        'papers' => papers,
        'themes' => themes,
        'areas' => site.data.fetch('research_areas')
      }
      current_data = data.merge(
        'papers' => papers.select { |paper| paper['themes'].any? { |theme| theme != 'foundation' } },
        'themes' => themes.reject { |theme| theme.fetch('tag') == 'foundation' }
      )
      { 'publication_explorer' => data, 'publication_explorer_current' => current_data }.each do |key, explorer|
        site.data[key] = explorer
        # Keep titles containing HTML characters inside the JSON script element.
        site.data["#{key}_json"] = JSON.generate(explorer).gsub('<', '\u003c').gsub('>', '\u003e').gsub('&', '\u0026')
      end
    end
  end
end
